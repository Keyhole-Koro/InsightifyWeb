import { ActionButton } from "@/components/ui/ActionButton";

interface ActionPanelProps {
  isInitialized: boolean;
  sessionId: string | null;
  initError: string | null;
  onAddLLMChatNode: () => void;
}

export function ActionPanel({
  isInitialized,
  sessionId,
  initError,
  onAddLLMChatNode,
}: ActionPanelProps) {
  return (
    <>
      <ActionButton
        onClick={onAddLLMChatNode}
        variant="secondary"
        style={{ position: "absolute", top: 16, right: 24, zIndex: 10 }}
      >
        Add LLM Chat Node
      </ActionButton>
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 24,
          zIndex: 10,
          background:
            "linear-gradient(135deg, rgba(248,250,252,0.95) 0%, rgba(238,242,255,0.9) 100%)",
          border: "1px solid rgba(148,163,184,0.5)",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 12,
          color: "#334155",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
          fontFamily: 'var(--font-ui, "Manrope", "Segoe UI", sans-serif)',
        }}
      >
        {isInitialized
          ? `Session Ready · ${sessionId}`
          : "Session Not Initialized"}
      </div>
      {initError ? (
        <div
          style={{
            position: "absolute",
            top: 96,
            right: 24,
            zIndex: 10,
            maxWidth: 360,
            border: "1px solid rgba(248,113,113,0.5)",
            background: "rgba(254,226,226,0.9)",
            color: "#991b1b",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
          }}
        >
          {initError}
        </div>
      ) : null}
    </>
  );
}
