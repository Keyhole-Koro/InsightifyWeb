import type { UiNode } from "@/contracts/ui";

const MESSAGE_PREVIEW_MAX = 80;

export const summarizeRestoredNodes = (nodes: UiNode[]) => {
  return nodes.map((node, index) => {
    const lastMessage =
      node.llmChat?.messages && node.llmChat.messages.length > 0
        ? (node.llmChat.messages[node.llmChat.messages.length - 1]?.content ?? "")
        : "";
    const lastMessagePreview =
      lastMessage.length > MESSAGE_PREVIEW_MAX
        ? `${lastMessage.slice(0, MESSAGE_PREVIEW_MAX)}...`
        : lastMessage;
    return {
      index,
      id: (node.id ?? "").trim() || null,
      type: node.type ?? null,
      title: (node.meta?.title ?? "").trim() || null,
      messageCount: node.llmChat?.messages?.length ?? 0,
      lastMessagePreview: lastMessagePreview || null,
    };
  });
};
