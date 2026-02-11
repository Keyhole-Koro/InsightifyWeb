import { useCallback, useEffect, useRef, type MutableRefObject } from "react";

import { sendChatMessage, startRun, type ChatNode } from "@/api/coreApi";
import { useLLMNodeState } from "@/hooks/useLLMNodeState";
import { useStreamWatch } from "@/hooks/useStreamWatch";

interface UseChatRunControllerOptions {
  sessionId: string | null;
  setSessionId: (value: string | null) => void;
  setInitError: (value: string | null) => void;
  reinitSession: () => Promise<{ sessionId?: string }>;
  isSessionNotFoundError: (message: string) => boolean;
  msgSeq: MutableRefObject<number>;
  nodeState: ReturnType<typeof useLLMNodeState>;
  upsertNodeFromRpc: (targetNodeID: string, node: ChatNode) => void;
  bindHandlers: (
    onInputChange: (nodeId: string, value: string) => void,
    onSend: (nodeId: string) => void,
  ) => void;
}

export function useChatRunController({
  sessionId,
  setSessionId,
  setInitError,
  reinitSession,
  isSessionNotFoundError,
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
    async (runId: string, nodeId: string, activeSessionId?: string) => {
      runIdByNodeRef.current[nodeId] = runId;
      const targetConversationID = (
        conversationIdByNodeRef.current[nodeId] ?? nodeId
      ).trim();
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
          activeSessionId ?? sessionId ?? undefined,
        );
      } finally {
      }
    },
    [nodeState, sessionId, setInitError, stream, upsertNodeFromRpc],
  );

  const startWorkerRun = useCallback(async (workerKey: string, activeSessionId: string) => {
    const startRes = await startRun({
      sessionId: activeSessionId,
      workerKey,
      params: {},
    });
    const runId = (startRes.runId ?? "").trim();
    if (!runId) {
      throw new Error(`StartRun did not return run_id for ${workerKey}`);
    }
    return runId;
  }, []);

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
          let activeSessionId = (sessionId ?? "").trim();
          if (!activeSessionId) {
            const reinit = await reinitSession();
            activeSessionId = (reinit.sessionId ?? "").trim();
            if (!activeSessionId) {
              throw new Error("InitRun did not return session_id");
            }
          }

          const activeRunId = (runIdByNodeRef.current[nodeId] ?? "").trim();
          if (!activeRunId) {
            throw new Error("No active run for this node.");
          }

          const pendingInteractionId = (
            pendingInputIdByNodeRef.current[nodeId] ?? ""
          ).trim();
          if (!pendingInteractionId) {
            throw new Error("Run is not waiting for input yet.");
          }
          const conversationId = (
            conversationIdByNodeRef.current[nodeId] ?? nodeId
          ).trim();

          let res;
          try {
            res = await sendChatMessage({
              sessionId: activeSessionId,
              runId: activeRunId,
              conversationId,
              interactionId: pendingInteractionId,
              input: submitted,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (!isSessionNotFoundError(message)) {
              throw err;
            }

            setSessionId(null);
            throw new Error("Session expired. Please reload and try again.");
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
          void streamToNode(activeRunId, nodeId, activeSessionId);
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
      isSessionNotFoundError,
      msgSeq,
      nodeState,
      reinitSession,
      sessionId,
      setInitError,
      setSessionId,
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
