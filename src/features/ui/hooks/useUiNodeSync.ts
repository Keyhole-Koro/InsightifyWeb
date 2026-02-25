import { useCallback, useMemo, type MutableRefObject } from "react";
import { type Edge, type Node } from "reactflow";
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
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  nodeSeq: MutableRefObject<number>;
  selectedActId?: string | null;
  onActSelect?: (actId: string) => void;
}

export function useUiNodeSync({
  setNodes,
  setEdges,
  nodeSeq,
  selectedActId,
  onActSelect,
}: UseUiNodeSyncOptions) {
  const proposalNodeId = (actId: string, actionId: string) =>
    `proposal::${actId}::${actionId}`;
  const isProposalNode = (nodeId: string, actId: string) =>
    nodeId.startsWith(`proposal::${actId}::`);
  const isProposalEdge = (edgeId: string, actId: string) =>
    edgeId.startsWith(`proposal-edge::${actId}::`);

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
              draggable: true,
              dragHandle: ".act-node-header",
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

          if (nodeSeq.current === 1) {
            nodeSeq.current += 1;
            const centeredNode: RuntimeGraphNode<"act"> = {
              id: targetNodeID,
              type: "act",
              draggable: true,
              dragHandle: ".act-node-header",
              position: { x: 0, y: 0 },
              data: {
                type: "act",
                meta: {
                  title: (node.meta?.title ?? "").trim() || "Act",
                },
                props: actProps,
              },
            };
            return [...current, centeredNode as Node<LLMInputNodeData>];
          }

          const position = {
            x: 100 + ((nodeSeq.current - 1) % 2) * 460,
            y: 110 + Math.floor((nodeSeq.current - 1) / 2) * 420,
          };
          nodeSeq.current += 1;

          const newNode: RuntimeGraphNode<"act"> = {
            id: targetNodeID,
            type: "act",
            draggable: true,
            dragHandle: ".act-node-header",
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

        setNodes((current) => {
          const baseNode = current.find((n) => n.id === targetNodeID);
          if (!baseNode) return current;
          const remaining = current.filter((n) => !isProposalNode(n.id, targetNodeID));
          const baseX = baseNode.position.x;
          const baseY = baseNode.position.y;

          const generated = (act.pendingActions ?? []).map((pa, i) => {
            const pId = proposalNodeId(targetNodeID, pa.id ?? `p-${i + 1}`);
            const pLabel = (pa.label ?? "").trim() || `Proposal ${i + 1}`;
            const pDesc = (pa.description ?? "").trim();
            const proposalProps: ActNodeProps = {
              actId: pId,
              status: "suggesting",
              mode: "suggesting",
              goal: pLabel,
              selectedWorker: act.selectedWorker,
              timeline: [
                {
                  id: `${pId}-evt`,
                  createdAtUnixMs: Date.now(),
                  kind: "suggestion",
                  summary: pLabel,
                  detail: pDesc,
                },
              ],
              pendingActions: [],
              isSelected: false,
              onSelect: () => onActSelect?.(targetNodeID),
            };
            const side = i % 2 === 0 ? 1 : -1;
            const lane = Math.floor(i / 2);
            return {
              id: pId,
              type: "act",
              draggable: true,
              dragHandle: ".act-node-header",
              position: {
                x: baseX + side * 560,
                y: baseY - 20 + lane * 180,
              },
              data: {
                type: "act" as const,
                meta: {
                  title: `Suggestion ${i + 1}`,
                },
                props: proposalProps,
              },
            } as Node<LLMInputNodeData>;
          });

          return [...remaining, ...generated];
        });

        setEdges((current) => {
          const pruned = current.filter((e) => !isProposalEdge(e.id, targetNodeID));
          const generated = (act.pendingActions ?? []).map((pa, i) => {
            const pId = proposalNodeId(targetNodeID, pa.id ?? `p-${i + 1}`);
            return {
              id: `proposal-edge::${targetNodeID}::${pId}`,
              source: targetNodeID,
              target: pId,
              animated: true,
              style: {
                stroke: "#14b8a6",
                strokeWidth: 2,
              },
            } as Edge;
          });
          return [...pruned, ...generated];
        });
      }
    },
    [nodeSeq, onActSelect, selectedActId, setEdges, setNodes],
  );

  return {
    nodeTypes,
    appendActTimelineEvent,
    upsertNodeFromRpc,
  };
}
