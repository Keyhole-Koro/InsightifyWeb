import { useEffect, useRef, type MutableRefObject } from "react";
import { type Node } from "reactflow";

import { useChatRunController } from "@/hooks/chat/useChatRunController";
import { useRpcChatNodeSync } from "@/hooks/chat/useRpcChatNodeSync";
import { useRunSession } from "@/hooks/chat/useRunSession";
import { useLLMNodeState } from "@/hooks/useLLMNodeState";
import type { LLMInputNodeData } from "@/types/graphTypes";

const BOOTSTRAP_NODE_ID = "init-purpose-node";
const BOOTSTRAP_WORKER_KEY = "bootstrap";
const DEFAULT_USER_ID = "demo-user";
const DEFAULT_REPO_URL = "https://github.com/Keyhole-Koro/PoliTopics.git";
const SESSION_STORAGE_KEY = "insightify.session_id";

interface UseBootstrapOptions {
  setNodes: React.Dispatch<React.SetStateAction<Node<LLMInputNodeData>[]>>;
  nodeSeq: MutableRefObject<number>;
  msgSeq: MutableRefObject<number>;
}

export function useBootstrap({
  setNodes,
  nodeSeq,
  msgSeq,
}: UseBootstrapOptions) {
  const initializedRef = useRef(false);
  const initializingRef = useRef(false);

  const {
    sessionId,
    setSessionId,
    initError,
    setInitError,
    isSessionNotFoundError,
    reinitSession,
  } = useRunSession(
    {
      storageKey: SESSION_STORAGE_KEY,
      defaultUserId: DEFAULT_USER_ID,
      defaultRepoUrl: DEFAULT_REPO_URL,
    },
  );

  const nodeState = useLLMNodeState(setNodes);
  const { nodeTypes, bindHandlers, upsertNodeFromRpc } = useRpcChatNodeSync({
    setNodes,
    nodeSeq,
  });

  const { startWorkerRun, streamToNode, cancelStream } = useChatRunController({
    sessionId,
    setSessionId,
    setInitError,
    reinitSession,
    isSessionNotFoundError,
    msgSeq,
    nodeState,
    upsertNodeFromRpc,
    bindHandlers,
  });

  useEffect(() => {
    if (initializedRef.current || initializingRef.current) return;
    initializedRef.current = true;
    initializingRef.current = true;

    void (async () => {
      try {
        const res = await reinitSession();
        const activeSessionId = (res.sessionId ?? "").trim();
        if (!activeSessionId) {
          throw new Error("InitRun did not return session_id");
        }
        const bootstrapRunId = await startWorkerRun(
          BOOTSTRAP_WORKER_KEY,
          activeSessionId,
        );
        await streamToNode(bootstrapRunId, BOOTSTRAP_NODE_ID, activeSessionId);
      } catch (err) {
        setInitError(err instanceof Error ? err.message : String(err));
      } finally {
        initializingRef.current = false;
      }
    })();

    return () => {
      cancelStream();
    };
  }, [cancelStream, reinitSession, sessionId, setInitError, startWorkerRun, streamToNode]);

  return {
    nodeTypes,
    sessionId,
    initError,
  };
}
