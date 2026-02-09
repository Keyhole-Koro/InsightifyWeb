import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { type Node } from "reactflow";

import { initRun, submitRunInput } from "@/api/pipelineApi";
import { LLMInputNode } from "@/components/graph/LLMInputNode/LLMInputNode";
import { useStringStorage } from "@/hooks/useSessionStorage";
import { useStreamWatch } from "@/hooks/useStreamWatch";
import { useLLMNodeState } from "@/hooks/useLLMNodeState";
import type { GraphNodeRegistry, LLMInputNodeData, RuntimeGraphNode } from "@/types/graphTypes";

const INIT_PURPOSE_NODE_ID = "init-purpose-node";
const DEFAULT_USER_ID = "demo-user";
const DEFAULT_REPO_URL = "https://github.com/Keyhole-Koro/PoliTopics.git";
const SESSION_STORAGE_KEY = "insightify.session_id";

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

  const initializingRef = useRef(false);

  const { stream, cancel: cancelStream } = useStreamWatch();
  const nodeState = useLLMNodeState(setNodes);

  const nodeTypes = useMemo<GraphNodeRegistry>(() => ({ llmChat: LLMInputNode }), []);

  // Stream response to a node
  const streamToNode = useCallback(
    async (runId: string, nodeId: string) => {
      setCurrentRunId(runId);

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
          nodeState.setResponding(nodeId, false);
        },
        onError: (message) => {
          setInitError(message);
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
      if (!sessionId) return;

      const submitted = nodeState.clearInputAndAddUserMessage(nodeId, msgSeq);
      if (!submitted) return;

      void (async () => {
        try {
          const res = await submitRunInput({
            sessionId,
            runId: currentRunId ?? undefined,
            input: submitted,
          });

          const nextRunId = res.runId ?? "";
          if (!nextRunId) {
            nodeState.setResponding(nodeId, false);
            return;
          }

          await streamToNode(nextRunId, nodeId);
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
    [sessionId, currentRunId, msgSeq, nodeState, streamToNode],
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
                    onInputChange: (value: string) => handleInputChange(INIT_PURPOSE_NODE_ID, value),
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
            onInputChange: (value: string) => handleInputChange(INIT_PURPOSE_NODE_ID, value),
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

  // Initialize session if not exists
  useEffect(() => {
    if (sessionId || initializingRef.current) return;

    initializingRef.current = true;

    void (async () => {
      try {
        const res = await initRun({
          userId: DEFAULT_USER_ID,
          repoUrl: DEFAULT_REPO_URL,
        });

        const sid = res.sessionId ?? null;
        setSessionId(sid);

        if (res.bootstrapRunId) {
          await streamToNode(res.bootstrapRunId, INIT_PURPOSE_NODE_ID);
        }
      } catch (err) {
        setInitError(err instanceof Error ? err.message : String(err));
      } finally {
        initializingRef.current = false;
      }
    })();

    return () => {
      cancelStream();
    };
  }, [sessionId, setSessionId, streamToNode, cancelStream]);

  return {
    nodeTypes,
    sessionId,
    initError,
    handleAddLLMChatNode,
  };
}
