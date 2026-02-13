import type { ProjectItem } from "@/api/coreApi";

interface ActionPanelProps {
  isInitialized: boolean;
  projectId: string | null;
  projects: ProjectItem[];
  onSelectProject: (projectId: string) => void | Promise<void>;
  onCreateProject: () => void | Promise<void>;
  onCreateChatNode: () => void | Promise<void>;
  initError: string | null;
}

export function ActionPanel({
  isInitialized,
  projectId,
  projects,
  onSelectProject,
  onCreateProject,
  onCreateChatNode,
  initError,
}: ActionPanelProps) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 16,
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
          ? `Project Ready · ${projectId}`
          : "Project Not Initialized"}
      </div>
      <div
        style={{
          position: "absolute",
          top: 52,
          right: 24,
          zIndex: 10,
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(148,163,184,0.35)",
          borderRadius: 10,
          padding: "8px 10px",
        }}
      >
        <select
          value={projectId ?? ""}
          onChange={(e) => void onSelectProject(e.target.value)}
          style={{
            minWidth: 180,
            border: "1px solid rgba(148,163,184,0.4)",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 12,
          }}
        >
          {projects.length === 0 ? (
            <option value="">No Projects</option>
          ) : null}
          {projects.map((project) => (
            <option key={project.projectId} value={project.projectId}>
              {project.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void onCreateProject()}
          style={{
            border: "1px solid rgba(59,130,246,0.45)",
            borderRadius: 6,
            background: "rgba(239,246,255,0.95)",
            color: "#1e3a8a",
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          New Project
        </button>
        <button
          type="button"
          onClick={() => void onCreateChatNode()}
          disabled={!isInitialized}
          style={{
            border: "1px solid rgba(16,185,129,0.45)",
            borderRadius: 6,
            background: isInitialized
              ? "rgba(236,253,245,0.95)"
              : "rgba(241,245,249,0.9)",
            color: isInitialized ? "#065f46" : "#64748b",
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: isInitialized ? "pointer" : "not-allowed",
          }}
        >
          Add LLM Chat
        </button>
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
