import { memo } from "react";
import type { ActTimelineEvent } from "@/features/worker/types/graphTypes";

const KIND_ICONS: Record<string, string> = {
    user_input: "💬",
    suggest: "💡",
    search: "🔍",
    run_worker: "⚙️",
    worker_result: "✅",
    error: "❌",
    status_change: "🔄",
};

const formatTime = (unixMs?: number): string => {
    if (!unixMs) return "";
    const d = new Date(unixMs);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

interface ActTimelineProps {
    events: ActTimelineEvent[];
}

export const ActTimeline = memo(({ events }: ActTimelineProps) => {
    if (events.length === 0) {
        return (
            <div
                style={{
                    padding: "16px",
                    color: "#94a3b8",
                    fontSize: 12,
                    textAlign: "center",
                }}
            >
                No events yet
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {events.map((evt, i) => {
                const icon = KIND_ICONS[evt.kind ?? ""] ?? "📌";
                return (
                    <div
                        key={evt.id ?? i}
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            padding: "6px 0",
                            borderBottom:
                                i < events.length - 1
                                    ? "1px solid rgba(148,163,184,0.15)"
                                    : "none",
                        }}
                    >
                        <span style={{ fontSize: 14, lineHeight: "20px", flexShrink: 0 }}>
                            {icon}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#334155",
                                    lineHeight: "18px",
                                    wordBreak: "break-word",
                                }}
                            >
                                {evt.summary ?? evt.kind ?? "event"}
                            </div>
                            {evt.detail ? (
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "#64748b",
                                        marginTop: 2,
                                        lineHeight: "16px",
                                    }}
                                >
                                    {evt.detail}
                                </div>
                            ) : null}
                            {evt.workerKey ? (
                                <span
                                    style={{
                                        fontSize: 10,
                                        color: "#6366f1",
                                        background: "rgba(99,102,241,0.08)",
                                        borderRadius: 4,
                                        padding: "1px 5px",
                                        marginTop: 2,
                                        display: "inline-block",
                                    }}
                                >
                                    {evt.workerKey}
                                </span>
                            ) : null}
                        </div>
                        {evt.createdAtUnixMs ? (
                            <span
                                style={{
                                    fontSize: 10,
                                    color: "#94a3b8",
                                    whiteSpace: "nowrap",
                                    flexShrink: 0,
                                    lineHeight: "20px",
                                }}
                            >
                                {formatTime(evt.createdAtUnixMs)}
                            </span>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
});
