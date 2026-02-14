import { useCallback, useMemo, useRef, type MutableRefObject } from "react";
import { type Node } from "reactflow";
import { LLMInputNode } from "@/components/graph/LLMInputNode/LLMInputNode";
import type { ChatNode } from "@/shared/types/core";
import type {
  ChatMessage,
  GraphNodeRegistry,
  LLMInputNodeData,
  RuntimeGraphNode,
} from "@/features/worker/types/graphTypes";

interface UseUiNodeSyncOptions {
  setNodes: React.Dispatch<React.SetStateAction<Node<LLMInputNodeData>[]>>;
  nodeSeq: MutableRefObject<number>;
}

export function useUiNodeSync({
  setNodes,
  nodeSeq,
}: UseUiNodeSyncOptions) {
  const mergeMessages = useCallback(
    (current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
      if (incoming.length === 0) {
        return current;
      }
      const merged = [...current];
      for (const msg of incoming) {
        const idx = merged.findIndex(
          (m) =>
            m.id === msg.id ||
            (m.role === msg.role && m.content.trim() === msg.content.trim()),
        );
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...msg };
          continue;
        }
        merged.push(msg);
      }
      return merged;
    },
    [],
  );

  const onInputChangeRef = useRef<(nodeId: string, value: string) => void>(
    () => {},
  );
  const onSendRef = useRef<(nodeId: string) => void>(() => {});

  const bindHandlers = useCallback(
    (
      onInputChange: (nodeId: string, value: string) => void,
      onSend: (nodeId: string) => void,
    ) => {
      onInputChangeRef.current = onInputChange;
      onSendRef.current = onSend;
    },
    [],
  );

  const nodeTypes = useMemo<GraphNodeRegistry>(
    () => ({ llmChat: LLMInputNode }),
    [],
  );

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
                title:
                  (node.meta?.title ?? data.meta?.title ?? "").trim() ||
                  data.meta?.title,
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
                messages: mergeMessages(data.props.messages, rpcMessages),
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
    [mergeMessages, nodeSeq, setNodes],
  );

  return {
    nodeTypes,
    bindHandlers,
    upsertNodeFromRpc,
  };
}
