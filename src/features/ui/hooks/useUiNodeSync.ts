import { useCallback, useMemo, type MutableRefObject } from "react";
import { type Node } from "reactflow";
import { ActNode } from "@/components/graph/ActNode/ActNode";
import { UI_ACT_STATUS, UI_NODE_TYPE, type UiNode } from "@/contracts/ui";
import type {
  ActTimelineEvent,
  ActNodeProps,
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
  selectedActId?: string | null;
  onActSelect?: (actId: string) => void;
}

export function useUiNodeSync({
  setNodes,
  nodeSeq,
  selectedActId,
  onActSelect,
}: UseUiNodeSyncOptions) {
  const appendActTimelineEvent = useCallback(
    (
      targetNodeID: string,
      event: ActTimelineEvent,
      status?: string,
      mode?: string,
    ) => {
      const eventId = (event.id ?? "").trim();
      setNodes((current) =>
        current.map((node) => {
          if (node.id !== targetNodeID) {
            return node;
          }
          const data = node.data as LLMInputNodeData;
          if (data.type !== "act") {
            return node;
          }
          const props = data.props as ActNodeProps;
          const timeline = [...(props.timeline ?? [])];
          const alreadyExists =
            eventId !== "" && timeline.some((evt) => (evt.id ?? "").trim() === eventId);
          if (!alreadyExists) {
            timeline.push(event);
          }
          return {
            ...node,
            data: {
              ...data,
              props: {
                ...props,
                timeline,
                status: status ?? props.status,
                mode: mode ?? props.mode,
              },
            },
          };
        }),
      );
    },
    [setNodes],
  );

  const nodeTypes = useMemo<GraphNodeRegistry>(
    () => ({
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
            isSelected: (selectedActId ?? "").trim() === targetNodeID,
            onSelect: () => onActSelect?.(targetNodeID),
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
      }
    },
    [nodeSeq, onActSelect, selectedActId, setNodes],
  );

  return {
    nodeTypes,
    appendActTimelineEvent,
    upsertNodeFromRpc,
  };
}
