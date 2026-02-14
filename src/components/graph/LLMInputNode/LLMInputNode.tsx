import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

import type { LLMInputNodeData } from "@/features/run/types/graphTypes";

export const LLMInputNode = memo(({ data }: NodeProps<LLMInputNodeData>) => {
  const { props, meta } = data;
  const sendDisabled =
    props.isResponding || Boolean(props.sendLocked) || props.input.trim().length === 0;

  return (
    <div
      style={{
        width: 420,
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        boxShadow:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.05)",
        fontFamily: 'var(--font-ui, "Manrope", "Segoe UI", sans-serif)',
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          background: "#cbd5e1",
          border: "2px solid #fff",
        }}
      />

      {/* Minimal Handle */}
      <div
        style={{
          height: 20,
          backgroundColor: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "grab",
        }}
      >
        <div
          style={{
            width: 32,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#cbd5e1",
          }}
        />
      </div>

      {/* Chat Area */}
      <div
        className="nodrag llm-chat-scroll"
        onWheelCapture={(event) => event.stopPropagation()}
        onTouchMoveCapture={(event) => event.stopPropagation()}
        style={{
          height: 300,
          overflowY: "auto",
          overscrollBehavior: "contain",
          padding: "16px",
          backgroundColor: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {props.messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                paddingLeft: isUser ? 32 : 0,
                paddingRight: isUser ? 0 : 32,
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "14px",
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  borderTopRightRadius: isUser ? 2 : 14,
                  borderTopLeftRadius: isUser ? 14 : 2,
                  backgroundColor: isUser ? "#2563eb" : "#ffffff",
                  color: isUser ? "#ffffff" : "#334155",
                  boxShadow: isUser
                    ? "0 4px 6px -1px rgba(37, 99, 235, 0.2)"
                    : "0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0,0,0,0.02)",
                  border: isUser ? "none" : "1px solid rgba(0,0,0,0.02)",
                }}
              >
                {message.content}
              </div>
            </div>
          );
        })}
        {props.isResponding && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "10px 16px",
                borderRadius: "14px",
                borderTopLeftRadius: 2,
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                fontSize: 12,
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: "#94a3b8",
                  borderRadius: "50%",
                  animation: "pulse 1.5s infinite",
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: "#94a3b8",
                  borderRadius: "50%",
                  animation: "pulse 1.5s infinite 0.2s",
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: "#94a3b8",
                  borderRadius: "50%",
                  animation: "pulse 1.5s infinite 0.4s",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: "16px",
          backgroundColor: "#ffffff",
          borderTop: "1px solid #f1f5f9",
        }}
      >
        <div style={{ position: "relative" }}>
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
            rows={2}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "12px 14px",
              paddingRight: "48px",
              fontSize: 14,
              lineHeight: 1.5,
              color: "#0f172a",
              backgroundColor: "#f8fafc",
              resize: "none",
              outline: "none",
              transition: "all 0.2s ease",
              fontFamily: "inherit",
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = "#ffffff";
              e.target.style.borderColor = "#3b82f6";
              e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = "#f8fafc";
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.boxShadow = "none";
            }}
          />
          <button
            type="button"
            className="nodrag"
            onClick={props.onSend}
            disabled={sendDisabled}
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              border: "none",
              borderRadius: "8px",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              background: sendDisabled ? "#cbd5e1" : "#2563eb",
              cursor: sendDisabled ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: sendDisabled
                ? "none"
                : "0 2px 4px rgba(37, 99, 235, 0.3)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "#94a3b8",
            textAlign: "right",
            fontWeight: 500,
          }}
        >
          {props.sendLocked && props.sendLockHint
            ? props.sendLockHint
            : "Shift + Enter で改行"}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          background: "#cbd5e1",
          border: "2px solid #fff",
        }}
      />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .llm-chat-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 116, 139, 0.6) transparent;
        }

        .llm-chat-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .llm-chat-scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 999px;
        }

        .llm-chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.55);
          border-radius: 999px;
          border: 1px solid rgba(248, 250, 252, 0.8);
        }

        .llm-chat-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.75);
        }
      `}</style>
    </div>
  );
});
