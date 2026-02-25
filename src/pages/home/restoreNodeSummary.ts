import type { UiNode } from "@/contracts/ui";

const MESSAGE_PREVIEW_MAX = 80;

export const summarizeRestoredNodes = (nodes: UiNode[]) => {
  return nodes.map((node, index) => {
    const timeline = node.act?.timeline ?? [];
    const lastEvent = timeline.length > 0 ? timeline[timeline.length - 1] : undefined;
    const preview = (lastEvent?.summary ?? "").trim();
    const lastMessagePreview =
      preview.length > MESSAGE_PREVIEW_MAX
        ? `${preview.slice(0, MESSAGE_PREVIEW_MAX)}...`
        : preview;
    return {
      index,
      id: (node.id ?? "").trim() || null,
      type: node.type ?? null,
      title: (node.meta?.title ?? "").trim() || null,
      messageCount: timeline.length,
      lastMessagePreview: lastMessagePreview || null,
    };
  });
};
