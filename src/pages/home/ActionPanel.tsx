import type { ProjectItem } from "@/contracts/project";
import type { UiWorkspaceTab } from "@/contracts/ui";

interface ActionPanelProps {
  isInitialized: boolean;
  projectId: string | null;
  projects: ProjectItem[];
  tabs: UiWorkspaceTab[];
  activeTabId: string;
  restoreStatus: string;
  onSelectProject: (projectId: string) => void | Promise<void>;
  onCreateProject: () => void | Promise<void>;
  onSelectTab: (tabId: string) => void | Promise<void>;
  onCreateTab: () => void | Promise<void>;
  onCreateChatNode: () => void | Promise<void>;
  initError: string | null;
}

export function ActionPanel({
  isInitialized,
  projectId,
  projects,
  tabs,
  activeTabId,
  restoreStatus,
  onSelectProject,
  onCreateProject,
  onSelectTab,
  onCreateTab,
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
          {projects.length === 0 ? <option value="">No Projects</option> : null}
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
      </div>

      <div
        style={{
          position: "absolute",
          top: 96,
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
          value={activeTabId}
          onChange={(e) => void onSelectTab(e.target.value)}
          disabled={!isInitialized || tabs.length === 0}
          style={{
            minWidth: 180,
            border: "1px solid rgba(148,163,184,0.4)",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 12,
            backgroundColor: !isInitialized ? "rgba(241,245,249,0.9)" : "white",
          }}
        >
          {tabs.length === 0 ? <option value="">No Tabs</option> : null}
          {tabs.map((tab) => {
            const tabId = (tab.tabId ?? "").trim();
            if (!tabId) {
              return null;
            }
            return (
              <option key={tabId} value={tabId}>
                {(tab.title ?? "Tab").trim() || "Tab"}
              </option>
            );
          })}
        </select>
        <button
          type="button"
          onClick={() => void onCreateTab()}
          disabled={!isInitialized}
          style={{
            border: "1px solid rgba(14,165,233,0.45)",
            borderRadius: 6,
            background: isInitialized
              ? "rgba(240,249,255,0.95)"
              : "rgba(241,245,249,0.9)",
            color: isInitialized ? "#0c4a6e" : "#64748b",
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: isInitialized ? "pointer" : "not-allowed",
          }}
        >
          New Tab
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
      {restoreStatus ? (
        <div
          style={{
            position: "absolute",
            top: 140,
            right: 24,
            zIndex: 10,
            maxWidth: 420,
            border: "1px solid rgba(56,189,248,0.45)",
            background: "rgba(224,242,254,0.92)",
            color: "#0c4a6e",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
          }}
        >
          {restoreStatus}
        </div>
      ) : null}
      {initError ? (
        <div
          style={{
            position: "absolute",
            top: restoreStatus ? 184 : 140,
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
