import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { type Node } from "reactflow";

import { initRun, sendChatMessage, startRun, type ChatNode } from "@/api/coreApi";
import { LLMInputNode } from "@/components/graph/LLMInputNode/LLMInputNode";
import { useStringStorage } from "@/hooks/useSessionStorage";
import { useStreamWatch } from "@/hooks/useStreamWatch";
import { useLLMNodeState } from "@/hooks/useLLMNodeState";
import type {
  GraphNodeRegistry,
  ChatMessage,
  LLMInputNodeData,
  RuntimeGraphNode,
} from "@/types/graphTypes";

const INIT_PURPOSE_NODE_ID = "init-purpose-node";
const INIT_PURPOSE_WORKER_KEY = "bootstrap";
const TEST_LLM_CHAT_WORKER_KEY = "testllmChar";
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

  const runIdByNodeRef = useRef<Record<string, string>>({});
  const pendingInputIdByNodeRef = useRef<Record<string, string>>({});
  const streamingByNodeRef = useRef<Record<string, boolean>>({});
  const onInputChangeRef = useRef<(nodeId: string, value: string) => void>(
    () => {},
  );
  const onSendRef = useRef<(nodeId: string) => void>(() => {});

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

  const upsertNodeFromRpc = useCallback(
    (targetNodeID: string, node: ChatNode) => {
      const llm = node.llmChat;
      if (!llm) {
        return;
      }
      const rpcMessages: ChatMessage[] = (llm.messages ?? [])
        .map((m) => {
          const role =
            m.role === "ROLE_USER"
              ? "user"
              : m.role === "ROLE_ASSISTANT"
                ? "assistant"
                : null;
          const content = (m.content ?? "").trim();
          if (!role || content === "") {
            return null;
          }
          return {
            id: (m.id ?? "").trim() || `msg-${Date.now()}-${Math.random()}`,
            role,
            content,
          };
        })
        .filter((m): m is ChatMessage => m !== null);

      setNodes((current) => {
        const idx = current.findIndex((n) => n.id === targetNodeID);
        if (idx >= 0) {
          const existing = current[idx];
          const data = existing.data as LLMInputNodeData;
          const next = [...current];
          next[idx] = {
            ...existing,
            data: {
              ...data,
              meta: {
                ...(data.meta ?? {}),
                title: (node.meta?.title ?? data.meta?.title ?? "").trim() || data.meta?.title,
              },
              props: {
                ...data.props,
                model: llm.model || data.props.model,
                isResponding:
                  typeof llm.isResponding === "boolean"
                    ? llm.isResponding
                    : data.props.isResponding,
                sendLocked:
                  typeof llm.sendLocked === "boolean"
                    ? llm.sendLocked
                    : data.props.sendLocked,
                sendLockHint: llm.sendLockHint ?? data.props.sendLockHint,
                messages: rpcMessages.length > 0 ? rpcMessages : data.props.messages,
                onInputChange: (value: string) =>
                  onInputChangeRef.current(targetNodeID, value),
                onSend: () => onSendRef.current(targetNodeID),
              },
            },
          };
          return next;
        }

        const position = {
          x: 100 + ((nodeSeq.current - 1) % 2) * 460,
          y: 110 + Math.floor((nodeSeq.current - 1) / 2) * 420,
        };
        nodeSeq.current += 1;

        const newNode: RuntimeGraphNode<"llmChat"> = {
          id: targetNodeID,
          type: "llmChat",
          position,
          data: {
            type: "llmChat",
            meta: {
              title: (node.meta?.title ?? "").trim() || "LLM Chat",
              description: node.meta?.description,
              tags: node.meta?.tags ?? [],
            },
            props: {
              model: llm.model || "Low",
              input: "",
              isResponding: llm.isResponding ?? false,
              sendLocked: llm.sendLocked ?? false,
              sendLockHint: llm.sendLockHint ?? "",
              messages: rpcMessages,
              onInputChange: (value: string) =>
                onInputChangeRef.current(targetNodeID, value),
              onSend: () => onSendRef.current(targetNodeID),
            },
          },
        };
        return [...current, newNode];
      });
    },
    [nodeSeq, setNodes],
  );

  const streamToNode = useCallback(
    async (runId: string, nodeId: string, activeSessionId?: string) => {
      runIdByNodeRef.current[nodeId] = runId;
      pendingInputIdByNodeRef.current[nodeId] = "";
      streamingByNodeRef.current[nodeId] = true;

      nodeState.setResponding(nodeId, true);
      nodeState.ensureAssistantMessage(nodeId);

      try {
        await stream(
          runId,
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
        streamingByNodeRef.current[nodeId] = false;
      }
    },
    [nodeState, sessionId, stream, upsertNodeFromRpc],
  );

  const startInitPurposeRun = useCallback(
    async (activeSessionId: string) => {
      const startRes = await startRun({
        sessionId: activeSessionId,
        workerKey: INIT_PURPOSE_WORKER_KEY,
        params: { is_bootstrap: "true" },
      });
      const runId = (startRes.runId ?? "").trim();
      if (!runId) {
        throw new Error("StartRun did not return run_id for bootstrap");
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

          let res;
          try {
            res = await sendChatMessage({
              sessionId: activeSessionId,
              runId: activeRunId,
              interactionId: pendingInteractionId,
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
            const initPurposeRunId = await startInitPurposeRun(activeSessionId);
            await streamToNode(
              initPurposeRunId,
              INIT_PURPOSE_NODE_ID,
              activeSessionId,
            );
            throw new Error(
              "Session expired. Started a new run; please send again.",
            );
          }

          if (!res.accepted) {
            nodeState.setResponding(nodeId, false);
            return;
          }

          pendingInputIdByNodeRef.current[nodeId] = "";
          nodeState.setResponding(nodeId, true);
          if (!streamingByNodeRef.current[nodeId]) {
            void streamToNode(activeRunId, nodeId, activeSessionId);
          }
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
      isSessionNotFoundError,
      logLocal,
      msgSeq,
      nodeState,
      reinitSession,
      sessionId,
      setSessionId,
      startInitPurposeRun,
      streamToNode,
    ],
  );
  onInputChangeRef.current = handleInputChange;
  onSendRef.current = handleSend;

  const handleAddLLMChatNode = useCallback(() => {
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

        const startRes = await startRun({
          sessionId: activeSessionId,
          workerKey: TEST_LLM_CHAT_WORKER_KEY,
          params: {},
        });
        const runId = (startRes.runId ?? "").trim();
        if (!runId) {
          throw new Error("StartRun did not return run_id for testllmChar");
        }

        await streamToNode(runId, runId, activeSessionId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setInitError(message);
        logLocal("failed to start testllmChar", { message });
      }
    })();
  }, [
    logLocal,
    reinitSession,
    sessionId,
    streamToNode,
  ]);

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
        const activeSessionId = (res.sessionId ?? "").trim();
        if (!activeSessionId) {
          throw new Error("InitRun did not return session_id");
        }
        const initPurposeRunId = await startInitPurposeRun(activeSessionId);
        logLocal("watch bootstrap run", { runId: initPurposeRunId });
        await streamToNode(
          initPurposeRunId,
          INIT_PURPOSE_NODE_ID,
          activeSessionId,
        );
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
  }, [cancelStream, logLocal, reinitSession, sessionId, startInitPurposeRun, streamToNode]);

  return {
    nodeTypes,
    sessionId,
    initError,
    handleAddLLMChatNode,
  };
}
