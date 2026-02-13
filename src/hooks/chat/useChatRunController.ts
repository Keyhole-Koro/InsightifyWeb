import { useCallback, useEffect, useRef, type MutableRefObject } from "react";

import { submitInput, startRun, type ChatNode } from "@/api/coreApi";
import { traceFrontend } from "@/debug/runTrace";
import { useLLMNodeState } from "@/hooks/chat/useLLMNodeState";
import { useStreamWatch } from "@/hooks/useStreamWatch";

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

  const { stream, cancel: cancelStream } = useStreamWatch();

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
      nodeState.ensureAssistantMessage(nodeId);

      try {
        await stream(
          runId,
          targetConversationID,
          {
            onChunk: (text) => {
              traceFrontend("on_chunk", {
                runId,
                nodeId,
                textLen: text.length,
              });
              nodeState.updateLastAssistantMessage(nodeId, text);
            },
            onComplete: (finalText) => {
              traceFrontend("on_complete", {
                runId,
                nodeId,
                finalTextLen: finalText.length,
              });
              if (finalText) {
                nodeState.updateLastAssistantMessage(nodeId, finalText);
              }
              pendingInputIdByNodeRef.current[nodeId] = "";
              nodeState.setResponding(nodeId, false);
            },
            onNeedUserInput: (inputRequestId) => {
              traceFrontend("on_need_user_input", {
                runId,
                nodeId,
                inputRequestId,
              });
              pendingInputIdByNodeRef.current[nodeId] = inputRequestId;
              nodeState.setResponding(nodeId, false);
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
              nodeState.addMessage(nodeId, {
                id: `msg-${Date.now()}`,
                role: "assistant",
                content: message,
              });
              nodeState.setResponding(nodeId, false);
            },
          },
          activeProjectId ?? projectId ?? undefined,
        );
      } finally {
        traceFrontend("stream_to_node_end", { runId, nodeId });
      }
    },
    [nodeState, projectId, setInitError, stream, upsertNodeFromRpc],
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
          traceFrontend("submit_input_request", {
            nodeId,
            projectId: activeProjectId,
            runId: activeRunId,
            conversationId,
            interactionId: pendingInteractionId,
            inputLen: submitted.length,
          });

          let res;
          try {
            res = await submitInput({
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
              traceFrontend(
                "submit_input_retry_without_interaction",
                {
                  nodeId,
                  runId: activeRunId,
                  message,
                },
                "warn",
              );
              res = await submitInput({
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
            traceFrontend("submit_input_not_accepted", { nodeId, runId: activeRunId }, "warn");
            nodeState.setResponding(nodeId, false);
            return;
          }
          traceFrontend("submit_input_accepted", {
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
      setInitError,
      setProjectId,
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
