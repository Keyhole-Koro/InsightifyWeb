import { useCallback, useEffect, useRef, type MutableRefObject } from "react";

import { sendChatMessage, startRun, type ChatNode } from "@/api/coreApi";
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
              nodeState.updateLastAssistantMessage(nodeId, text);
            },
            onComplete: (finalText) => {
              if (finalText) {
                nodeState.updateLastAssistantMessage(nodeId, finalText);
              }
              pendingInputIdByNodeRef.current[nodeId] = "";
              nodeState.setResponding(nodeId, false);
            },
            onNeedUserInput: (inputRequestId) => {
              pendingInputIdByNodeRef.current[nodeId] = inputRequestId;
              nodeState.setResponding(nodeId, false);
            },
            onConversationResolved: (conversationId) => {
              conversationIdByNodeRef.current[nodeId] = conversationId;
            },
            onNode: (node) => {
              upsertNodeFromRpc(nodeId, node);
            },
            onError: (message) => {
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
      }
    },
    [nodeState, projectId, setInitError, stream, upsertNodeFromRpc],
  );

  const startWorkerRun = useCallback(
    async (workerKey: string, activeProjectId: string) => {
      const startRes = await startRun({
        projectId: activeProjectId,
        workerKey,
        params: {},
      });
      const runId = (startRes.runId ?? "").trim();
      if (!runId) {
        throw new Error(`StartRun did not return run_id for ${workerKey}`);
      }
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

          let res;
          try {
            res = await sendChatMessage({
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
              res = await sendChatMessage({
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
            nodeState.setResponding(nodeId, false);
            return;
          }
          const nextConversationId = (res.conversationId ?? "").trim();
          if (nextConversationId) {
            conversationIdByNodeRef.current[nodeId] = nextConversationId;
          }

          pendingInputIdByNodeRef.current[nodeId] = "";
          nodeState.setResponding(nodeId, true);
          void streamToNode(activeRunId, nodeId, activeProjectId);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
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
