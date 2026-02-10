import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { type Node } from "reactflow";

import { initRun, respondNeedUserInput } from "@/api/coreApi";
import { LLMInputNode } from "@/components/graph/LLMInputNode/LLMInputNode";
import { useStringStorage } from "@/hooks/useSessionStorage";
import { useStreamWatch } from "@/hooks/useStreamWatch";
import { useLLMNodeState } from "@/hooks/useLLMNodeState";
import type {
  GraphNodeRegistry,
  LLMInputNodeData,
  RuntimeGraphNode,
} from "@/types/graphTypes";

const INIT_PURPOSE_NODE_ID = "init-purpose-node";
const DEFAULT_USER_ID = "demo-user";
const DEFAULT_REPO_URL = "https://github.com/Keyhole-Koro/PoliTopics.git";
const SESSION_STORAGE_KEY = "insightify.session_id";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const HOSTNAME = typeof window !== "undefined" ? window.location.hostname : "";
const IS_LOCAL_ENV =
  import.meta.env.DEV ||
  import.meta.env.MODE === "local" ||
  import.meta.env.MODE === "development" ||
  import.meta.env.VITE_ENV === "local" ||
  LOCAL_HOSTS.has(HOSTNAME);

interface UseInitPurposeNodeOptions {
  setNodes: React.Dispatch<React.SetStateAction<Node<LLMInputNodeData>[]>>;
  nodeSeq: MutableRefObject<number>;
  msgSeq: MutableRefObject<number>;
}

export function useInitPurposeNode({
  setNodes,
  nodeSeq,
  msgSeq,
}: UseInitPurposeNodeOptions) {
  const [sessionId, setSessionId] = useStringStorage(SESSION_STORAGE_KEY);
  const [initError, setInitError] = useState<string | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [currentInputRequestId, setCurrentInputRequestId] = useState<
    string | null
  >(null);

  const initializingRef = useRef(false);
  const initializedRef = useRef(false);

  const { stream, cancel: cancelStream } = useStreamWatch();
  const nodeState = useLLMNodeState(setNodes);

  const nodeTypes = useMemo<GraphNodeRegistry>(
    () => ({ llmChat: LLMInputNode }),
    [],
  );
  const logLocal = useCallback((...args: unknown[]) => {
    if (!IS_LOCAL_ENV) return;
    console.log("[init-purpose]", ...args);
  }, []);

  const isSessionNotFoundError = useCallback((message: string) => {
    const text = message.toLowerCase();
    return text.includes("session") && text.includes("not found");
  }, []);

  const reinitSession = useCallback(async () => {
    logLocal("InitRun start", {
      mode: import.meta.env.MODE,
      viteEnv: import.meta.env.VITE_ENV,
    });
    const res = await initRun({
      userId: DEFAULT_USER_ID,
      repoUrl: DEFAULT_REPO_URL,
    });
    const sid = res.sessionId ?? "";
    if (!sid) {
      throw new Error("InitRun did not return session_id");
    }
    setSessionId(sid);
    logLocal("InitRun success", {
      sessionId: sid,
      bootstrapRunId: res.bootstrapRunId ?? "",
    });
    return res;
  }, [logLocal, setSessionId]);

  // Stream response to a node
  const streamToNode = useCallback(
    async (runId: string, nodeId: string) => {
      setCurrentRunId(runId);
      setCurrentInputRequestId(null);

      nodeState.setResponding(nodeId, true);
      nodeState.ensureAssistantMessage(nodeId);

      await stream(runId, {
        onChunk: (text) => {
          nodeState.updateLastAssistantMessage(nodeId, text);
        },
        onComplete: (finalText) => {
          if (finalText) {
            nodeState.updateLastAssistantMessage(nodeId, finalText);
          }
          setCurrentInputRequestId(null);
          nodeState.setResponding(nodeId, false);
        },
        onNeedUserInput: (inputRequestId) => {
          setCurrentInputRequestId(inputRequestId);
          nodeState.setResponding(nodeId, false);
        },
        onError: (message) => {
          setInitError(message);
          setCurrentInputRequestId(null);
          nodeState.addMessage(nodeId, {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: message,
          });
          nodeState.setResponding(nodeId, false);
        },
      });
    },
    [stream, nodeState],
  );

  // Handle user input change
  const handleInputChange = useCallback(
    (nodeId: string, value: string) => {
      nodeState.setInput(nodeId, value);
    },
    [nodeState],
  );

  // Handle send for any node
  const handleSend = useCallback(
    (nodeId: string) => {
      const submitted = nodeState.clearInputAndAddUserMessage(nodeId, msgSeq);
      if (!submitted) return;

      void (async () => {
        try {
          let activeSessionId = (sessionId ?? "").trim();
          if (!activeSessionId) {
            logLocal("session missing on send; running InitRun", { nodeId });
            const reinit = await reinitSession();
            activeSessionId = (reinit.sessionId ?? "").trim();
            if (!activeSessionId) {
              throw new Error("InitRun did not return session_id");
            }
          }
          let res;
          const activeRunId = (currentRunId ?? "").trim();
          if (!activeRunId) {
            throw new Error("No active run. Reinitialize and try again.");
          }
          if (!currentInputRequestId) {
            throw new Error("Run is not waiting for input yet.");
          }
          try {
            res = await respondNeedUserInput({
              sessionId: activeSessionId,
              runId: activeRunId,
              input: submitted,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (!isSessionNotFoundError(message)) {
              throw err;
            }
            logLocal("session not found; reinitializing", {
              nodeId,
              runId: activeRunId,
              previousSessionId: activeSessionId,
            });
            setSessionId(null);
            const reinit = await reinitSession();
            activeSessionId = reinit.sessionId ?? "";
            if (!activeSessionId) {
              throw new Error("InitRun did not return session_id");
            }
            if (reinit.bootstrapRunId) {
              await streamToNode(reinit.bootstrapRunId, nodeId);
            }
            throw new Error(
              "Session expired. Started a new run; please send again.",
            );
          }

          const acknowledgedRunId = res.runId ?? "";
          if (!acknowledgedRunId) {
            nodeState.setResponding(nodeId, false);
            return;
          }
          setCurrentInputRequestId(null);
          nodeState.setResponding(nodeId, true);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logLocal("handleSend failed", { nodeId, message });
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
      sessionId,
      currentRunId,
      currentInputRequestId,
      msgSeq,
      nodeState,
      streamToNode,
      isSessionNotFoundError,
      reinitSession,
      setSessionId,
      logLocal,
    ],
  );

  // Ensure the initial purpose node exists
  const ensureInitPurposeNode = useCallback(() => {
    setNodes((current) => {
      const existing = current.find((node) => node.id === INIT_PURPOSE_NODE_ID);

      if (existing) {
        return current.map((node) =>
          node.id !== INIT_PURPOSE_NODE_ID
            ? node
            : {
                ...node,
                data: {
                  ...(node.data as LLMInputNodeData),
                  props: {
                    ...(node.data as LLMInputNodeData).props,
                    onInputChange: (value: string) =>
                      handleInputChange(INIT_PURPOSE_NODE_ID, value),
                    onSend: () => handleSend(INIT_PURPOSE_NODE_ID),
                  },
                },
              },
        );
      }

      const initNode: RuntimeGraphNode<"llmChat"> = {
        id: INIT_PURPOSE_NODE_ID,
        type: "llmChat",
        position: { x: 120, y: 120 },
        data: {
          type: "llmChat",
          meta: { title: "Init Purpose" },
          props: {
            model: "Low",
            input: "",
            isResponding: false,
            messages: [],
            onInputChange: (value: string) =>
              handleInputChange(INIT_PURPOSE_NODE_ID, value),
            onSend: () => handleSend(INIT_PURPOSE_NODE_ID),
          },
        },
      };
      return [initNode, ...current];
    });
  }, [handleInputChange, handleSend, setNodes]);

  // Add a new LLM chat node
  const handleAddLLMChatNode = useCallback(() => {
    const id = `llm-input-${Date.now()}-${nodeSeq.current++}`;

    const nextNode: RuntimeGraphNode<"llmChat"> = {
      id,
      type: "llmChat",
      position: {
        x: 100 + ((nodeSeq.current - 1) % 2) * 460,
        y: 110 + Math.floor((nodeSeq.current - 1) / 2) * 420,
      },
      data: {
        type: "llmChat",
        meta: { title: "LLM Chat" },
        props: {
          model: "Low",
          input: "",
          isResponding: false,
          messages: [
            {
              id: `msg-${msgSeq.current++}`,
              role: "assistant",
              content: "こんにちは。ここで質問してください。",
            },
          ],
          onInputChange: (value: string) => handleInputChange(id, value),
          onSend: () => handleSend(id),
        },
      },
    };

    setNodes((current) => [...current, nextNode]);
  }, [handleInputChange, handleSend, msgSeq, nodeSeq, setNodes]);

  // Initialize on mount
  useEffect(() => {
    ensureInitPurposeNode();
  }, [ensureInitPurposeNode]);

  // Initialize session on mount to refresh local session state and cookie alignment.
  useEffect(() => {
    if (initializedRef.current || initializingRef.current) return;

    logLocal("mount", {
      mode: import.meta.env.MODE,
      viteEnv: import.meta.env.VITE_ENV,
      hostname: HOSTNAME,
      existingSessionId: sessionId ?? "",
      isLocal: IS_LOCAL_ENV,
    });
    initializedRef.current = true;
    initializingRef.current = true;

    void (async () => {
      try {
        const res = await reinitSession();
        if (res.bootstrapRunId) {
          logLocal("watch bootstrap run", { runId: res.bootstrapRunId });
          await streamToNode(res.bootstrapRunId, INIT_PURPOSE_NODE_ID);
        }
      } catch (err) {
        logLocal("mount initialization failed", {
          message: err instanceof Error ? err.message : String(err),
        });
        setInitError(err instanceof Error ? err.message : String(err));
      } finally {
        initializingRef.current = false;
      }
    })();

    return () => {
      cancelStream();
    };
  }, [streamToNode, cancelStream, reinitSession, logLocal, sessionId]);

  return {
    nodeTypes,
    sessionId,
    initError,
    handleAddLLMChatNode,
  };
}
