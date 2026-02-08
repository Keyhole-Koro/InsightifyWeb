import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

import type { LLMInputNodeData } from "@/types/graphTypes";

export const LLMInputNode = memo(({ data }: NodeProps<LLMInputNodeData>) => {
  const { props, meta } = data;
  const sendDisabled = props.isResponding || props.input.trim().length === 0;

  return (
    <div
      style={{
        width: 440,
        background: "linear-gradient(165deg, #f8fafc 0%, #eef2ff 100%)",
        border: "1px solid rgba(148, 163, 184, 0.45)",
        borderRadius: 16,
        boxShadow: "0 14px 30px rgba(15, 23, 42, 0.18)",
        overflow: "hidden",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 10, height: 10 }}
      />
      <div
        style={{
          background:
            "linear-gradient(120deg, #0f172a 0%, #1e293b 45%, #0ea5e9 120%)",
          color: "#e2e8f0",
          padding: "10px 14px",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{meta?.title ?? "LLM Prompt Console"}</span>
        <span
          style={{
            fontWeight: 600,
            color: "#e0f2fe",
            background: "rgba(14, 165, 233, 0.25)",
            border: "1px solid rgba(125, 211, 252, 0.55)",
            borderRadius: 999,
            padding: "2px 8px",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {props.model ?? "LLM"}
        </span>
      </div>

      <div
        className="nodrag"
        style={{
          height: 250,
          overflowY: "auto",
          padding: 12,
          background:
            "radial-gradient(circle at top right, rgba(186,230,253,0.35) 0%, rgba(248,250,252,0.7) 55%)",
          borderBottom: "1px solid rgba(148, 163, 184, 0.35)",
        }}
      >
        {props.messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              justifyContent:
                message.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                maxWidth: "86%",
                whiteSpace: "pre-wrap",
                fontSize: 12,
                lineHeight: 1.45,
                padding: "9px 11px",
                borderRadius: 12,
                border:
                  message.role === "user"
                    ? "1px solid rgba(30, 41, 59, 0.85)"
                    : "1px solid rgba(148, 163, 184, 0.45)",
                background:
                  message.role === "user"
                    ? "linear-gradient(120deg, #0f172a 0%, #1e293b 100%)"
                    : "#ffffff",
                color: message.role === "user" ? "#f8fafc" : "#0f172a",
                boxShadow:
                  message.role === "user"
                    ? "0 6px 14px rgba(15, 23, 42, 0.25)"
                    : "0 4px 10px rgba(15, 23, 42, 0.08)",
              }}
            >
              {message.content}
            </div>
          </div>
        ))}
        {props.isResponding ? (
          <div
            style={{
              fontSize: 12,
              color: "#0369a1",
              padding: "4px 6px",
              fontWeight: 600,
            }}
          >
            返信を生成中...
          </div>
        ) : null}
      </div>

      <div style={{ padding: 12 }}>
        <div
          style={{
            marginBottom: 8,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#334155",
          }}
        >
          Prompt
        </div>
        <textarea
          className="nodrag"
          value={props.input}
          onChange={(e) => props.onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              props.onSend();
            }
          }}
          placeholder="Ask, summarize, compare, or break down the task..."
          rows={3}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid rgba(148, 163, 184, 0.65)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 13,
            lineHeight: 1.5,
            color: "#0f172a",
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            resize: "none",
            boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.08)",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
          }}
        >
          <span style={{ fontSize: 11, color: "#64748b" }}>
            Enter to send, Shift+Enter for newline
          </span>
          <button
            type="button"
            className="nodrag"
            onClick={props.onSend}
            disabled={sendDisabled}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: "#f8fafc",
              background:
                sendDisabled
                  ? "#94a3b8"
                  : "linear-gradient(120deg, #0ea5e9 0%, #2563eb 100%)",
              boxShadow: sendDisabled
                ? "none"
                : "0 8px 16px rgba(37, 99, 235, 0.3)",
              cursor: sendDisabled ? "not-allowed" : "pointer",
            }}
          >
            Send Prompt
          </button>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 10, height: 10 }}
      />
    </div>
  );
});
