import { useCallback, useEffect, type MutableRefObject } from "react";

import { send, wait } from "@/features/interaction/api";
import { useInteractionState } from "@/features/interaction/hooks/useInteractionState";
import { startRun } from "@/features/worker/api";
import { useUiNodeState } from "@/features/ui/hooks/useUiNodeState";
import { useStreamWatch } from "@/features/worker/hooks/useStreamWatch";
import { traceFrontend } from "@/debug/runTrace";
import type { ChatNode } from "@/shared/types/core";

interface UseInteractionFlowOptions {
  projectId: string | null;
  setProjectId: (value: string | null) => void;
  setInitError: (value: string | null) => void;
  reinitProject: () => Promise<{ projectId?: string }>;
  isProjectNotFoundError: (message: string) => boolean;
  msgSeq: MutableRefObject<number>;
  nodeState: ReturnType<typeof useUiNodeState>;
  upsertNodeFromRpc: (targetNodeID: string, node: ChatNode) => void;
  bindHandlers: (
    onInputChange: (nodeId: string, value: string) => void,
    onSend: (nodeId: string) => void,
  ) => void;
}

export function useInteractionFlow({
  projectId,
  setProjectId,
  setInitError,
  reinitProject,
  isProjectNotFoundError,
  msgSeq,
  nodeState,
  upsertNodeFromRpc,
  bindHandlers,
}: UseInteractionFlowOptions) {
  const interactionSession = useInteractionState();
  const { stream, cancel: cancelStream, cancelRun } = useStreamWatch();

  const ensureNodeShell = useCallback(
    (nodeId: string) => {
      upsertNodeFromRpc(nodeId, {
        id: nodeId,
        type: "UI_NODE_TYPE_LLM_CHAT",
        meta: { title: nodeId },
        llmChat: {
          isResponding: true,
          sendLocked: false,
          sendLockHint: "",
          messages: [],
        },
      });
      nodeState.setResponding(nodeId, true);
      nodeState.ensureServerMessage(nodeId);
    },
    [nodeState, upsertNodeFromRpc],
  );

  const applyServerMessage = useCallback(
    (nodeId: string, text: string, terminal: boolean) => {
      nodeState.updateLastServerMessage(nodeId, text);
      if (terminal) {
        nodeState.setResponding(nodeId, false);
      }
    },
    [nodeState],
  );

  const streamToNode = useCallback(
    async (runId: string, nodeId: string, activeProjectId?: string) => {
      traceFrontend("stream_to_node_start", {
        runId,
        nodeId,
        projectId: activeProjectId ?? projectId ?? "",
      });

      const prevRunId = interactionSession.getRunId(nodeId);
      interactionSession.setRunId(nodeId, runId);
      if (prevRunId !== "" && prevRunId !== runId) {
        interactionSession.clearPendingInteractionId(nodeId);
      }
      interactionSession.clearPendingInteractionId(nodeId);

      ensureNodeShell(nodeId);

      const waitPromise = wait({ runId, timeoutMs: 600_000 })
        .then((res) => {
          traceFrontend("wait_response", {
            runId,
            nodeId,
            waiting: Boolean(res.waiting),
            closed: Boolean(res.closed),
            interactionId: res.interactionId ?? "",
          });
          return res;
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          traceFrontend("wait_error", { runId, nodeId, message }, "error");
          return { waiting: false, closed: false, interactionId: "" };
        });

      let streamFinished = false;
      try {
        const streamPromise = stream(runId, {
          onChunk: (text) => applyServerMessage(nodeId, text, false),
          onComplete: (finalText) => {
            if (finalText) {
              applyServerMessage(nodeId, finalText, true);
            } else {
              nodeState.setResponding(nodeId, false);
            }
            interactionSession.clearPendingInteractionId(nodeId);
            streamFinished = true;
          },
          onNode: (node) => upsertNodeFromRpc(nodeId, node),
          onError: (message) => {
            traceFrontend("stream_error", { runId, nodeId, message }, "error");
            setInitError(message);
            interactionSession.clearPendingInteractionId(nodeId);
            streamFinished = true;
            nodeState.addMessage(nodeId, {
              id: `msg-${Date.now()}`,
              role: "assistant",
              content: message,
            });
            applyServerMessage(nodeId, message, true);
          },
        });

        const first = await Promise.race([
          streamPromise.then(() => "stream"),
          waitPromise.then((res) => (res.waiting ? "wait" : "idle")),
        ]);

        if (first === "wait" && !streamFinished) {
          const waiting = await waitPromise;
          interactionSession.setPendingInteractionId(nodeId, (waiting.interactionId ?? "").trim());
          nodeState.setResponding(nodeId, false);
          cancelRun(runId);
          await streamPromise.catch(() => undefined);
        } else {
          await streamPromise;
        }
      } finally {
        traceFrontend("stream_to_node_end", { runId, nodeId });
      }
    },
    [
      applyServerMessage,
      cancelRun,
      ensureNodeShell,
      nodeState,
      projectId,
      setInitError,
      stream,
      upsertNodeFromRpc,
    ],
  );

  const startWorkerRun = useCallback(async (workerKey: string, activeProjectId: string) => {
    const res = await startRun({ projectId: activeProjectId, workerKey, params: {} });
    const runId = (res.runId ?? "").trim();
    if (!runId) {
      throw new Error(`StartRun did not return run_id for ${workerKey}`);
    }
    return runId;
  }, []);

  const handleInputChange = useCallback(
    (nodeId: string, value: string) => nodeState.setInput(nodeId, value),
    [nodeState],
  );

  const handleSend = useCallback(
    (nodeId: string) => {
      const submitted = nodeState.clearInputAndAddUserMessage(nodeId, msgSeq);
      if (!submitted) {
        return;
      }

      void (async () => {
        try {
          let activeProjectId = (projectId ?? "").trim();
          if (!activeProjectId) {
            const reinit = await reinitProject();
            activeProjectId = (reinit.projectId ?? "").trim();
            if (!activeProjectId) {
              throw new Error("InitRun did not return project_id");
            }
          }

          const runId = interactionSession.getRunId(nodeId);
          if (!runId) {
            throw new Error("No active run for this node.");
          }

          const interactionId = interactionSession.getPendingInteractionId(nodeId);
          const res = await send({
            runId,
            interactionId,
            input: submitted,
          });

          if (!res.accepted) {
            nodeState.setResponding(nodeId, false);
            return;
          }

          interactionSession.clearPendingInteractionId(nodeId);
          nodeState.setResponding(nodeId, true);
          void streamToNode(runId, nodeId, activeProjectId);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (isProjectNotFoundError(message)) {
            setProjectId(null);
          }
          setInitError(message);
          nodeState.addMessage(nodeId, {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: message,
          });
          nodeState.setResponding(nodeId, false);
        }
      })();
    },
    [
      isProjectNotFoundError,
      msgSeq,
      nodeState,
      projectId,
      reinitProject,
      setInitError,
      setProjectId,
      interactionSession,
      streamToNode,
    ],
  );

  useEffect(() => {
    bindHandlers(handleInputChange, handleSend);
  }, [bindHandlers, handleInputChange, handleSend]);

  return {
    startWorkerRun,
    streamToNode,
    cancelStream,
  };
}
