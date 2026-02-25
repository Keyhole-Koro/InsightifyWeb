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
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                boxShadow: isSelected
                    ? "0 0 0 2px #6366f1, 0 10px 15px -3px rgba(99, 102, 241, 0.15)"
                    : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.05)",
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
                style={{
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
                    borderBottom: "1px solid rgba(99,102,241,0.12)",
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

            {/* Pending Actions (only when needs_user_action) */}
            {pendingActions.length > 0 ? (
                <div
                    className="nodrag"
                    style={{
                        padding: "10px 16px",
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                    }}
                >
                    {pendingActions.map((action) => (
                        <button
                            key={action.id}
                            type="button"
                            title={action.description ?? ""}
                            style={{
                                border: "1px solid rgba(99,102,241,0.3)",
                                borderRadius: 8,
                                background: "rgba(238,242,255,0.95)",
                                color: "#4338ca",
                                padding: "5px 12px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                            }}
                        >
                            {action.label ?? action.id}
                        </button>
                    ))}
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
