import { useCallback, useState } from "react";

import {
  createProject,
  listProjects,
  selectProject,
  type ProjectItem,
} from "@/features/project/api";
import {
  initRun,
  type InitRunRequest,
} from "@/features/run/api";
import { useStringStorage } from "@/shared/hooks/useSessionStorage";

export interface RunSessionConfig {
  storageKey: string;
  defaultUserId: string;
  defaultRepoUrl?: string;
  defaultProjectName?: string;
}

export function useRunSession(
  config: RunSessionConfig,
) {
  const [projectId, setProjectId] = useStringStorage(config.storageKey);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [initError, setInitError] = useState<string | null>(null);

  const isProjectNotFoundError = useCallback((message: string) => {
    const text = message.toLowerCase();
    return text.includes("project") && text.includes("not found");
  }, []);

  const refreshProjects = useCallback(async () => {
    const res = await listProjects({
      userId: config.defaultUserId,
    });
    setProjects(res.projects ?? []);
    return res;
  }, [config.defaultUserId]);

  const selectProjectById = useCallback(
    async (targetProjectID: string) => {
      const selected = (targetProjectID ?? "").trim();
      if (!selected) {
        throw new Error("project_id is required");
      }
      await selectProject({
        userId: config.defaultUserId,
        projectId: selected,
      });
      setProjectId(selected);
      return selected;
    },
    [config.defaultUserId, setProjectId],
  );

  const createProjectAndSelect = useCallback(
    async (name?: string, repoUrl?: string) => {
      const created = await createProject({
        userId: config.defaultUserId,
        name: (name ?? "").trim() || config.defaultProjectName || "",
        repoUrl: repoUrl ?? config.defaultRepoUrl ?? "",
      });
      const createdProjectID = (created.project?.projectId ?? "").trim();
      if (!createdProjectID) {
        throw new Error("CreateProject did not return project_id");
      }
      await selectProjectById(createdProjectID);
      await refreshProjects();
      return createdProjectID;
    },
    [
      config.defaultProjectName,
      config.defaultRepoUrl,
      config.defaultUserId,
      refreshProjects,
      selectProjectById,
    ],
  );

  const reinitProject = useCallback(async (forceProjectID?: string) => {
    let activeProjectID = (forceProjectID ?? projectId ?? "").trim();
    if (!activeProjectID) {
      const listed = await refreshProjects();
      activeProjectID = (
        listed.activeProjectId ??
        listed.projects?.[0]?.projectId ??
        ""
      ).trim();
      if (!activeProjectID) {
        activeProjectID = await createProjectAndSelect(
          config.defaultProjectName,
          config.defaultRepoUrl,
        );
      } else {
        await selectProjectById(activeProjectID);
      }
    }

    const res = await initRun({
      userId: config.defaultUserId,
      projectId: activeProjectID,
      repoUrl: config.defaultRepoUrl ?? "",
    });
    const resolvedProjectID = (res.projectId ?? "").trim();
    if (!resolvedProjectID) {
      throw new Error("InitRun did not return project_id");
    }
    setProjectId(resolvedProjectID);
    return { ...res, projectId: resolvedProjectID };
  }, [
    config.defaultProjectName,
    config.defaultRepoUrl,
    config.defaultUserId,
    createProjectAndSelect,
    projectId,
    refreshProjects,
    selectProjectById,
    setProjectId,
  ]);

  return {
    projectId,
    setProjectId,
    projects,
    refreshProjects,
    selectProjectById,
    createProjectAndSelect,
    initError,
    setInitError,
    isProjectNotFoundError,
    reinitProject,
  };
}
