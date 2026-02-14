import { useCallback, useEffect, useRef, type MutableRefObject } from "react";

import {
  runClient,
  startRun,
  waitForInput,
  sendMessage,
  closeInteraction,
} from "@/features/run/api";
import { toEventType } from "@/features/run/utils";
import type { EventType } from "@/shared/types/api";
import type { ChatNode } from "@/shared/types/core";

import { traceFrontend } from "@/debug/runTrace";
import { useLLMNodeState } from "@/features/run/hooks/chat/useLLMNodeState";
import { useStreamWatch } from "@/features/run/hooks/useStreamWatch";

interface UseChatRunControllerOptions {
  projectId: string | null;
  setProjectId: (value: string | null) => void;
  setInitError: (value: string | null) => void;
  reinitProject: () => Promise<{ projectId?: string }>;
  isProjectNotFoundError: (message: string) => boolean;
  msgSeq: MutableRefObject<number>;
  nodeState: ReturnType<typeof useLLMNodeState>;
  upsertNodeFromRpc: (targetNodeID: string, node: ChatNode) => void;
  bindHandlers: (
    onInputChange: (nodeId: string, value: string) => void,
    onSend: (nodeId: string) => void,
  ) => void;
}

export function useChatRunController({
  projectId,
  setProjectId,
  setInitError,
  reinitProject,
  isProjectNotFoundError,
  msgSeq,
  nodeState,
  upsertNodeFromRpc,
  bindHandlers,
}: UseChatRunControllerOptions) {
  const runIdByNodeRef = useRef<Record<string, string>>({});
  const conversationIdByNodeRef = useRef<Record<string, string>>({});
  const pendingInputIdByNodeRef = useRef<Record<string, string>>({});

  const { stream, cancel: cancelStream, cancelRun } = useStreamWatch();

  const applyServerMessage = useCallback(
    (nodeId: string, text: string, terminal: boolean) => {
      nodeState.updateLastServerMessage(nodeId, text);
      if (terminal) {
        nodeState.setResponding(nodeId, false);
      }
    },
    [nodeState],
  );

  const sendUserMessage = useCallback(
    async (args: {
      projectId: string;
      runId: string;
      conversationId: string;
      interactionId: string;
      input: string;
    }) =>
      sendMessage({
        projectId: args.projectId,
        runId: args.runId,
        conversationId: args.conversationId,
        interactionId: args.interactionId,
        input: args.input,
      }),
    [],
  );

  const streamToNode = useCallback(
    async (runId: string, nodeId: string, activeProjectId?: string) => {
      traceFrontend("stream_to_node_start", {
        runId,
        nodeId,
        projectId: activeProjectId ?? projectId ?? "",
      });
      const previousRunID = (runIdByNodeRef.current[nodeId] ?? "").trim();
      runIdByNodeRef.current[nodeId] = runId;
      // Reset node-scoped pending/conversation state when run changes to avoid stale interaction IDs.
      if (previousRunID != "" && previousRunID !== runId) {
        pendingInputIdByNodeRef.current[nodeId] = "";
        conversationIdByNodeRef.current[nodeId] = "";
      }
      const targetConversationID = runId.trim();
      conversationIdByNodeRef.current[nodeId] = targetConversationID;
      pendingInputIdByNodeRef.current[nodeId] = "";

      // Ensure a node shell exists even before the first RPC node event arrives.
      upsertNodeFromRpc(nodeId, {
        id: nodeId,
        type: "UI_NODE_TYPE_LLM_CHAT",
        meta: {
          title: nodeId,
        },
        llmChat: {
          isResponding: true,
          sendLocked: false,
          sendLockHint: "",
          messages: [],
        },
      });

      nodeState.setResponding(nodeId, true);
      nodeState.ensureServerMessage(nodeId);

      const waitForInputPromise = waitForInput({
        projectId: activeProjectId ?? projectId ?? "",
        runId,
        conversationId: targetConversationID,
        timeoutMs: 600_000,
      })
        .then((res) => {
          traceFrontend("wait_for_input_response", {
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
          traceFrontend("wait_for_input_error", { runId, nodeId, message }, "error");
          return {
            waiting: false,
            closed: false,
            interactionId: "",
          };
        });

      let streamFinished = false;
      try {
        const streamPromise = stream(
          runId,
          targetConversationID,
          {
            onChunk: (text) => {
              traceFrontend("on_chunk", {
                runId,
                nodeId,
                textLen: text.length,
              });
              applyServerMessage(nodeId, text, false);
            },
            onComplete: (finalText) => {
              traceFrontend("on_complete", {
                runId,
                nodeId,
                finalTextLen: finalText.length,
              });
              if (finalText) {
                applyServerMessage(nodeId, finalText, true);
              } else {
                nodeState.setResponding(nodeId, false);
              }
              pendingInputIdByNodeRef.current[nodeId] = "";
              streamFinished = true;
            },
            onConversationResolved: (conversationId) => {
              traceFrontend("on_conversation_resolved", {
                runId,
                nodeId,
                conversationId,
              });
              conversationIdByNodeRef.current[nodeId] = conversationId;
            },
            onNode: (node) => {
              traceFrontend("on_node", {
                runId,
                nodeId,
                rpcNodeId: node.id ?? "",
                title: node.meta?.title ?? "",
              });
              upsertNodeFromRpc(nodeId, node);
            },
            onError: (message) => {
              traceFrontend("stream_callback_error", { runId, nodeId, message }, "error");
              setInitError(message);
              pendingInputIdByNodeRef.current[nodeId] = "";
              streamFinished = true;
              nodeState.addMessage(nodeId, {
                id: `msg-${Date.now()}`,
                role: "assistant",
                content: message,
              });
              applyServerMessage(nodeId, message, true);
            },
          },
          activeProjectId ?? projectId ?? undefined,
        );

        const first = await Promise.race([
          streamPromise.then(() => "stream"),
          waitForInputPromise.then((res) => (res.waiting ? "waiting" : "idle")),
        ]);
        if (first === "waiting" && !streamFinished) {
          const waitingState = await waitForInputPromise;
          pendingInputIdByNodeRef.current[nodeId] = (waitingState.interactionId ?? "").trim();
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
    [cancelRun, nodeState, projectId, setInitError, stream, upsertNodeFromRpc],
  );

  const startWorkerRun = useCallback(
    async (workerKey: string, activeProjectId: string) => {
      traceFrontend("start_worker_run_request", {
        workerKey,
        projectId: activeProjectId,
      });
      const startRes = await startRun({
        projectId: activeProjectId,
        workerKey,
        params: {},
      });
      const runId = (startRes.runId ?? "").trim();
      if (!runId) {
        throw new Error(`StartRun did not return run_id for ${workerKey}`);
      }
      traceFrontend("start_worker_run_response", {
        workerKey,
        projectId: activeProjectId,
        runId,
      });
      return runId;
    },
    [],
  );

  const handleInputChange = useCallback(
    (nodeId: string, value: string) => {
      nodeState.setInput(nodeId, value);
    },
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
          traceFrontend("handle_send_begin", { nodeId });
          let activeProjectId = (projectId ?? "").trim();
          if (!activeProjectId) {
            const reinit = await reinitProject();
            activeProjectId = (reinit.projectId ?? "").trim();
            if (!activeProjectId) {
              throw new Error("InitRun did not return project_id");
            }
          }

          const activeRunId = (runIdByNodeRef.current[nodeId] ?? "").trim();
          if (!activeRunId) {
            throw new Error("No active run for this node.");
          }

          const pendingInteractionId = (
            pendingInputIdByNodeRef.current[nodeId] ?? ""
          ).trim();
          const conversationId = (
            conversationIdByNodeRef.current[nodeId] ?? activeRunId
          ).trim();
          traceFrontend("send_message_request", {
            nodeId,
            projectId: activeProjectId,
            runId: activeRunId,
            conversationId,
            interactionId: pendingInteractionId,
            inputLen: submitted.length,
          });

          let res;
          try {
            res = await sendUserMessage({
              projectId: activeProjectId,
              runId: activeRunId,
              conversationId,
              interactionId: pendingInteractionId,
              input: submitted,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.toLowerCase().includes("interaction_id mismatch")) {
              // Retry once without interaction ID so backend can bind latest pending request.
              traceFrontend("send_message_retry_without_interaction", {
                nodeId,
                runId: activeRunId,
                message,
              }, "warn");
              res = await sendUserMessage({
                projectId: activeProjectId,
                runId: activeRunId,
                conversationId,
                interactionId: "",
                input: submitted,
              });
            } else if (isProjectNotFoundError(message)) {
              setProjectId(null);
              throw new Error("Project expired. Please reload and try again.");
            } else {
              throw err;
            }
          }

          if (!res.accepted) {
            traceFrontend("send_message_not_accepted", { nodeId, runId: activeRunId }, "warn");
            nodeState.setResponding(nodeId, false);
            return;
          }
          traceFrontend("send_message_accepted", {
            nodeId,
            runId: activeRunId,
            interactionId: res.interactionId ?? "",
            conversationId: res.conversationId ?? "",
          });
          const nextConversationId = (res.conversationId ?? "").trim();
          if (nextConversationId) {
            conversationIdByNodeRef.current[nodeId] = nextConversationId;
          }

          pendingInputIdByNodeRef.current[nodeId] = "";
          nodeState.setResponding(nodeId, true);
          void streamToNode(activeRunId, nodeId, activeProjectId);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          traceFrontend("handle_send_error", { nodeId, message }, "error");
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
      reinitProject,
      projectId,
      sendUserMessage,
      setInitError,
      setProjectId,
      streamToNode,
    ],
  );

  useEffect(() => {
    bindHandlers(handleInputChange, handleSend);
  }, [bindHandlers, handleInputChange, handleSend]);

  return {
    sendUserMessage,
    applyServerMessage,
    startWorkerRun,
    streamToNode,
    cancelStream,
  };
}
