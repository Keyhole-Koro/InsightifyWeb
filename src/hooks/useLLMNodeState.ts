import { useCallback } from "react";
import type { Node } from "reactflow";

import type { LLMInputNodeData, ChatMessage } from "@/types/graphTypes";

type NodeSetter = React.Dispatch<
  React.SetStateAction<Node<LLMInputNodeData>[]>
>;

/**
 * Hook for managing LLM chat node state updates.
 */
export function useLLMNodeState(setNodes: NodeSetter) {
  const updateNode = useCallback(
    (nodeId: string, updater: (data: LLMInputNodeData) => LLMInputNodeData) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? { ...node, data: updater(node.data as LLMInputNodeData) }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const setInput = useCallback(
    (nodeId: string, value: string) => {
      updateNode(nodeId, (data) => ({
        ...data,
        props: { ...data.props, input: value },
      }));
    },
    [updateNode],
  );

  const setResponding = useCallback(
    (nodeId: string, isResponding: boolean) => {
      updateNode(nodeId, (data) => ({
        ...data,
        props: { ...data.props, isResponding },
      }));
    },
    [updateNode],
  );

  const addMessage = useCallback(
    (nodeId: string, message: ChatMessage) => {
      updateNode(nodeId, (data) => ({
        ...data,
        props: {
          ...data.props,
          messages: [...data.props.messages, message],
        },
      }));
    },
    [updateNode],
  );

  const updateLastAssistantMessage = useCallback(
    (nodeId: string, content: string) => {
      updateNode(nodeId, (data) => {
        const messages = [...data.props.messages];
        const last = messages[messages.length - 1];

        if (last?.role === "assistant") {
          messages[messages.length - 1] = { ...last, content };
        } else {
          messages.push({
            id: `msg-${Date.now()}`,
            role: "assistant",
            content,
          });
        }

        return {
          ...data,
          props: { ...data.props, messages },
        };
      });
    },
    [updateNode],
  );

  const ensureAssistantMessage = useCallback(
    (nodeId: string) => {
      updateNode(nodeId, (data) => {
        const messages = data.props.messages;
        const last = messages[messages.length - 1];

        if (last?.role === "assistant") return data;

        return {
          ...data,
          props: {
            ...data.props,
            messages: [
              ...messages,
              {
                id: `msg-${Date.now()}`,
                role: "assistant" as const,
                content: "",
              },
            ],
          },
        };
      });
    },
    [updateNode],
  );

  const clearInputAndAddUserMessage = useCallback(
    (nodeId: string, msgSeq: { current: number }): string => {
      let submitted = "";

      setNodes((current) =>
        current.map((node) => {
          if (node.id !== nodeId) return node;

          const data = node.data as LLMInputNodeData;
          const content = data.props.input.trim();

          if (!content || data.props.isResponding) return node;

          submitted = content;
          return {
            ...node,
            data: {
              ...data,
              props: {
                ...data.props,
                input: "",
                isResponding: true,
                messages: [
                  ...data.props.messages,
                  {
                    id: `msg-${msgSeq.current++}`,
                    role: "user" as const,
                    content,
                  },
                ],
              },
            },
          };
        }),
      );

      return submitted;
    },
    [setNodes],
  );

  return {
    updateNode,
    setInput,
    setResponding,
    addMessage,
    updateLastAssistantMessage,
    ensureAssistantMessage,
    clearInputAndAddUserMessage,
  };
}
