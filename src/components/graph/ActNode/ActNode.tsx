import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

import type { GraphNodeData, ActNodeProps } from "@/features/worker/types/graphTypes";
import { ActTimeline } from "./ActTimeline";

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
    idle: { bg: "#f1f5f9", fg: "#64748b", label: "Idle" },
    planning: { bg: "#ede9fe", fg: "#7c3aed", label: "Planning" },
    suggesting: { bg: "#fef3c7", fg: "#d97706", label: "Suggesting" },
    searching: { bg: "#dbeafe", fg: "#2563eb", label: "Searching" },
    running_worker: { bg: "#e0e7ff", fg: "#4f46e5", label: "Running" },
    needs_user_action: { bg: "#fef9c3", fg: "#ca8a04", label: "Action Needed" },
    done: { bg: "#dcfce7", fg: "#16a34a", label: "Done" },
    failed: { bg: "#fee2e2", fg: "#dc2626", label: "Failed" },
};

const getStatusStyle = (mode: string) =>
    STATUS_COLORS[mode] ?? { bg: "#f1f5f9", fg: "#64748b", label: mode || "Unknown" };

export const ActNode = memo(({ data }: NodeProps<GraphNodeData<"act">>) => {
    const props = data.props as ActNodeProps;
    const { goal, mode, timeline, pendingActions, isSelected, onSelect } = props;
    const statusStyle = getStatusStyle(mode);

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            style={{
                width: 420,
                background:
                  "radial-gradient(circle at 85% 8%, rgba(56,189,248,0.14) 0%, rgba(255,255,255,0) 46%), linear-gradient(165deg, #ffffff 0%, #f8fafc 72%, #f1f5f9 100%)",
                borderRadius: "18px",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: isSelected
                    ? "0 0 0 2px rgba(14,165,233,0.55), 0 16px 32px rgba(2, 132, 199, 0.22)"
                    : "0 12px 24px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15,23,42,0.08)",
                fontFamily: 'var(--font-ui, "Manrope", "Segoe UI", sans-serif)',
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                transition: "box-shadow 0.15s ease",
            }}
        >
            <Handle
                type="target"
                position={Position.Top}
                style={{
                    width: 10,
                    height: 10,
                    background: "#a5b4fc",
                    border: "2px solid #fff",
                }}
            />

            {/* Header */}
            <div
                className="act-node-header"
                style={{
                    padding: "12px 16px",
                    background:
                      "linear-gradient(125deg, rgba(224,242,254,0.78) 0%, rgba(219,234,254,0.74) 44%, rgba(236,253,245,0.68) 100%)",
                    borderBottom: "1px solid rgba(2,132,199,0.14)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "grab",
                }}
            >
                <span style={{ fontSize: 16 }}>🎯</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#1e1b4b",
                            lineHeight: "18px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {goal || "New Act"}
                    </div>
                </div>
                <span
                    style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: statusStyle.fg,
                        background: statusStyle.bg,
                        borderRadius: 6,
                        padding: "3px 8px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                    }}
                >
                    {statusStyle.label}
                </span>
            </div>

            {/* Timeline */}
            <div
                className="nodrag act-timeline-scroll"
                onWheelCapture={(event) => event.stopPropagation()}
                onTouchMoveCapture={(event) => event.stopPropagation()}
                style={{
                    maxHeight: 260,
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                    padding: "8px 16px",
                    backgroundColor: "#fafbfc",
                }}
            >
                <ActTimeline events={timeline} />
            </div>

            {pendingActions.length > 0 ? (
              <div
                style={{
                  padding: "10px 16px 12px",
                  borderTop: "1px solid rgba(15,23,42,0.06)",
                  fontSize: 11,
                  color: "#0f766e",
                  fontWeight: 700,
                }}
              >
                {pendingActions.length} suggestions spawned as linked nodes
              </div>
            ) : null}

            <Handle
                type="source"
                position={Position.Bottom}
                style={{
                    width: 10,
                    height: 10,
                    background: "#a5b4fc",
                    border: "2px solid #fff",
                }}
            />
            <style>{`
        .act-timeline-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(99, 102, 241, 0.4) transparent;
        }

        .act-timeline-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .act-timeline-scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 999px;
        }

        .act-timeline-scroll::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.35);
          border-radius: 999px;
        }

        .act-timeline-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.55);
        }
      `}</style>
        </div>
    );
});
