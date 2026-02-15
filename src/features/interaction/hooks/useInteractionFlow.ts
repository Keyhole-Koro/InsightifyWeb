import { useCallback, useEffect, useRef, type MutableRefObject } from "react";

import { onAssistantMessage, send, wait } from "@/features/interaction/api";
import { useInteractionState } from "@/features/interaction/hooks/useInteractionState";
import { startRun } from "@/features/worker/api";
import { useUiNodeState } from "@/features/ui/hooks/useUiNodeState";
import type { UiNode } from "@/contracts/ui";

interface UseInteractionFlowOptions {
  projectId: string | null;
  setProjectId: (value: string | null) => void;
  setInitError: (value: string | null) => void;
  ensureActiveProject: () => Promise<{ projectId?: string }>;
  isProjectNotFoundError: (message: string) => boolean;
  msgSeq: MutableRefObject<number>;
  nodeState: ReturnType<typeof useUiNodeState>;
  upsertNodeFromRpc: (targetNodeID: string, node: UiNode) => void;
  bindHandlers: (
    onInputChange: (nodeId: string, value: string) => void,
    onSend: (nodeId: string) => void,
  ) => void;
}

export function useInteractionFlow({
  projectId,
  setProjectId,
  setInitError,
  ensureActiveProject,
  isProjectNotFoundError,
  msgSeq,
  nodeState,
  upsertNodeFromRpc,
  bindHandlers,
}: UseInteractionFlowOptions) {
  const interactionSession = useInteractionState();
  const offByNodeRef = useRef<Record<string, () => void>>({});

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

  const initInteractionNode = useCallback(
    async (runId: string, nodeId: string) => {
      const prevRunId = interactionSession.getRunId(nodeId);
      interactionSession.setRunId(nodeId, runId);
      if (prevRunId !== "" && prevRunId !== runId) {
        interactionSession.clearPendingInteractionId(nodeId);
      }

      ensureNodeShell(nodeId);
      offByNodeRef.current[nodeId]?.();
      offByNodeRef.current[nodeId] = onAssistantMessage(runId, ({ interactionId, assistantMessage }) => {
        // First assistant message can arrive before React commits node creation.
        // Ensure the node exists before mutating chat messages.
        ensureNodeShell(nodeId);
        nodeState.updateLastServerMessage(nodeId, assistantMessage);
        if (interactionId !== "") {
          interactionSession.setPendingInteractionId(nodeId, interactionId);
        }
        nodeState.setResponding(nodeId, false);
      });
      const waiting = await wait({ runId, timeoutMs: 5_000 });
      interactionSession.setPendingInteractionId(
        nodeId,
        (waiting.interactionId ?? "").trim(),
      );
      nodeState.setResponding(nodeId, false);
    },
    [ensureNodeShell, interactionSession, nodeState],
  );

  const startWorkerRun = useCallback(async (workerKey: string, activeProjectId: string) => {
    const res = await startRun({ projectId: activeProjectId, workerId: workerKey, params: {} });
    const runId = (res.runId ?? "").trim();
    if (!runId) {
      throw new Error(`StartRun did not return run_id for ${workerKey}`);
    }
    return runId;
  }, []);
  const setNodeRunId = useCallback((nodeId: string, runId: string) => {
    const targetNodeId = (nodeId ?? "").trim();
    const targetRunId = (runId ?? "").trim();
    if (!targetNodeId || !targetRunId) {
      return;
    }
    interactionSession.setRunId(targetNodeId, targetRunId);
  }, [interactionSession]);
  const cancelStream = useCallback(() => undefined, []);

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
            const ensuredProject = await ensureActiveProject();
            activeProjectId = (ensuredProject.projectId ?? "").trim();
            if (!activeProjectId) {
              throw new Error("EnsureProject did not return project_id");
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

          const assistant = (res.assistantMessage ?? "").trim();
          if (assistant) {
            nodeState.addMessage(nodeId, {
              id: `msg-${Date.now()}`,
              role: "assistant",
              content: assistant,
            });
            nodeState.updateLastServerMessage(nodeId, assistant);
          }
          interactionSession.clearPendingInteractionId(nodeId);
          interactionSession.setPendingInteractionId(
            nodeId,
            (res.interactionId ?? interactionId ?? "").trim(),
          );
          nodeState.setResponding(nodeId, true);
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
      ensureActiveProject,
      setInitError,
      setProjectId,
      interactionSession,
    ],
  );

  useEffect(() => {
    bindHandlers(handleInputChange, handleSend);
  }, [bindHandlers, handleInputChange, handleSend]);

  useEffect(() => {
    return () => {
      const entries = Object.entries(offByNodeRef.current);
      for (const [, off] of entries) {
        off();
      }
      offByNodeRef.current = {};
    };
  }, []);

  return {
    startWorkerRun,
    initInteractionNode,
    setNodeRunId,
    cancelStream,
  };
}
