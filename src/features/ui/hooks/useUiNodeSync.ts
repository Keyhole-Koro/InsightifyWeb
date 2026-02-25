import { useCallback, useMemo, useRef, type MutableRefObject } from "react";
import { type Node } from "reactflow";
import { LLMInputNode } from "@/components/graph/LLMInputNode/LLMInputNode";
import { ActNode } from "@/components/graph/ActNode/ActNode";
import { UI_ACT_STATUS, UI_MESSAGE_ROLE, UI_NODE_TYPE, type UiNode } from "@/contracts/ui";
import type {
  ActNodeProps,
  ChatMessage,
  GraphNodeRegistry,
  LLMInputNodeData,
  RuntimeGraphNode,
} from "@/features/worker/types/graphTypes";

const ACT_STATUS_NAMES: Record<number, string> = {
  [UI_ACT_STATUS.UNSPECIFIED]: "idle",
  [UI_ACT_STATUS.IDLE]: "idle",
  [UI_ACT_STATUS.PLANNING]: "planning",
  [UI_ACT_STATUS.SUGGESTING]: "suggesting",
  [UI_ACT_STATUS.SEARCHING]: "searching",
  [UI_ACT_STATUS.RUNNING_WORKER]: "running_worker",
  [UI_ACT_STATUS.NEEDS_USER_ACTION]: "needs_user_action",
  [UI_ACT_STATUS.DONE]: "done",
  [UI_ACT_STATUS.FAILED]: "failed",
};

interface UseUiNodeSyncOptions {
  setNodes: React.Dispatch<React.SetStateAction<Node<LLMInputNodeData>[]>>;
  nodeSeq: MutableRefObject<number>;
}

export function useUiNodeSync({
  setNodes,
  nodeSeq,
}: UseUiNodeSyncOptions) {
  const mapRpcRole = (role: unknown): "user" | "assistant" | null => {
    if (role === UI_MESSAGE_ROLE.USER) {
      return "user";
    }
    if (role === UI_MESSAGE_ROLE.ASSISTANT) {
      return "assistant";
    }
    return null;
  };

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
    () => { },
  );
  const onSendRef = useRef<(nodeId: string) => void>(() => { });
  const onSelectActRef = useRef<(actId: string) => void>(() => { });

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

  const bindActHandlers = useCallback(
    (onSelectAct: (actId: string) => void) => {
      onSelectActRef.current = onSelectAct;
    },
    [],
  );

  const nodeTypes = useMemo<GraphNodeRegistry>(
    () => ({
      llmChat: LLMInputNode,
      act: ActNode as GraphNodeRegistry["act"],
    }),
    [],
  );

  const upsertNodeFromRpc = useCallback(
    (targetNodeID: string, node: UiNode) => {
      // --- Act node branch ---
      if (node.type === UI_NODE_TYPE.ACT && node.act) {
        const act = node.act;
        const statusNum = act.status ?? UI_ACT_STATUS.UNSPECIFIED;
        const modeName = act.mode || ACT_STATUS_NAMES[statusNum] || "idle";

        setNodes((current) => {
          const idx = current.findIndex((n) => n.id === targetNodeID);

          const actProps: ActNodeProps = {
            actId: act.actId ?? targetNodeID,
            status: ACT_STATUS_NAMES[statusNum] ?? "idle",
            mode: modeName,
            goal: act.goal ?? "",
            selectedWorker: act.selectedWorker,
            timeline: (act.timeline ?? []).map((evt) => ({
              id: evt.id ?? `evt-${Math.random()}`,
              createdAtUnixMs: evt.createdAtUnixMs,
              kind: evt.kind,
              summary: evt.summary,
              detail: evt.detail,
              workerKey: evt.workerKey,
            })),
            pendingActions: (act.pendingActions ?? []).map((pa) => ({
              id: pa.id ?? `pa-${Math.random()}`,
              label: pa.label,
              description: pa.description,
            })),
            isSelected: false, // selection state is managed externally
            onSelect: () => onSelectActRef.current(targetNodeID),
          };

          if (idx >= 0) {
            const existing = current[idx];
            const next = [...current];
            next[idx] = {
              ...existing,
              data: {
                type: "act" as const,
                meta: {
                  title: (node.meta?.title ?? "").trim() || "Act",
                },
                props: actProps,
              },
            };
            return next;
          }

          const position = {
            x: 100 + ((nodeSeq.current - 1) % 2) * 460,
            y: 110 + Math.floor((nodeSeq.current - 1) / 2) * 420,
          };
          nodeSeq.current += 1;

          const newNode: RuntimeGraphNode<"act"> = {
            id: targetNodeID,
            type: "act",
            position,
            data: {
              type: "act",
              meta: {
                title: (node.meta?.title ?? "").trim() || "Act",
              },
              props: actProps,
            },
          };
          return [...current, newNode as Node<LLMInputNodeData>];
        });
        return;
      }

      // --- LLM Chat node branch (original) ---
      const llm = node.llmChat;
      if (!llm) {
        return;
      }

      const rpcMessages: ChatMessage[] = (llm.messages ?? [])
        .map((m) => {
          const role = mapRpcRole(m.role);
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
          const chatProps = data.props as import("@/features/worker/types/graphTypes").LLMChatNodeProps;
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
                ...chatProps,
                model: llm.model || chatProps.model,
                isResponding:
                  typeof llm.isResponding === "boolean"
                    ? llm.isResponding
                    : chatProps.isResponding,
                sendLocked:
                  typeof llm.sendLocked === "boolean"
                    ? llm.sendLocked
                    : chatProps.sendLocked,
                sendLockHint: llm.sendLockHint ?? chatProps.sendLockHint,
                messages: mergeMessages(chatProps.messages, rpcMessages),
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
    bindActHandlers,
    upsertNodeFromRpc,
  };
}

