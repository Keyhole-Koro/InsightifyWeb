import { useRunSession } from "@/features/project/hooks/useRunSession";

const DEFAULT_USER_ID = "demo-user";
const PROJECT_STORAGE_KEY = "insightify.active_project_id";

export function useHomeProject() {
  const session = useRunSession({
    storageKey: PROJECT_STORAGE_KEY,
    defaultUserId: DEFAULT_USER_ID,
    defaultProjectName: "Project",
  });

  return {
    projectId: session.projectId,
    setProjectId: session.setProjectId,
    projects: session.projects,
    refreshProjects: session.refreshProjects,
    selectProjectById: session.selectProjectById,
    createProjectAndSelect: session.createProjectAndSelect,
    initError: session.initError,
    setInitError: session.setInitError,
    isProjectNotFoundError: session.isProjectNotFoundError,
    ensureActiveProject: session.ensureActiveProject,
  };
}

