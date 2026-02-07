import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

import type { LLMInputNodeData } from "@/types/graphTypes";

export const LLMInputNode = memo(({ data }: NodeProps<LLMInputNodeData>) => {
  const { props, meta } = data;

  return (
    <div
      style={{
        width: 420,
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 14,
        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)",
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
          background: "#0f172a",
          color: "#e2e8f0",
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{meta?.title ?? "LLM Chat"}</span>
        <span style={{ fontWeight: 500, color: "#94a3b8" }}>
          {props.model ?? "LLM"}
        </span>
      </div>

      <div
        className="nodrag"
        style={{
          height: 240,
          overflowY: "auto",
          padding: 10,
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
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
                padding: "8px 10px",
                borderRadius: 10,
                border:
                  message.role === "user"
                    ? "1px solid #0f172a"
                    : "1px solid #cbd5e1",
                background: message.role === "user" ? "#0f172a" : "#ffffff",
                color: message.role === "user" ? "#f8fafc" : "#0f172a",
              }}
            >
              {message.content}
            </div>
          </div>
        ))}
        {props.isResponding ? (
          <div style={{ fontSize: 12, color: "#64748b", padding: "2px 4px" }}>
            返信を生成中...
          </div>
        ) : null}
      </div>

      <div style={{ padding: 10 }}>
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
          placeholder="メッセージを入力..."
          rows={3}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 12,
            resize: "none",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            className="nodrag"
            onClick={props.onSend}
            disabled={props.isResponding || props.input.trim().length === 0}
            style={{
              border: "none",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 600,
              color: "#f8fafc",
              background:
                props.isResponding || props.input.trim().length === 0
                  ? "#94a3b8"
                  : "#2563eb",
              cursor:
                props.isResponding || props.input.trim().length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Send
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
