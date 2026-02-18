import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { type Node } from "reactflow";

import type { UiWorkspaceTab } from "@/contracts/ui";
import type { LLMInputNodeData } from "@/features/worker/types/graphTypes";
import { useHomeBootstrapRunner } from "./useHomeBootstrapRunner";
import { useHomeProject } from "./useHomeProject";
import { useUiRestore } from "./useUiRestore";

interface UseBootstrapOptions {
  setNodes: React.Dispatch<React.SetStateAction<Node<LLMInputNodeData>[]>>;
  nodeSeq: MutableRefObject<number>;
  msgSeq: MutableRefObject<number>;
}

export function useBootstrap({
  setNodes,
  nodeSeq,
  msgSeq,
}: UseBootstrapOptions) {
  const initializedRef = useRef(false);
  const initializingRef = useRef(false);
  const [tabs, setTabs] = useState<UiWorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");

  const {
    projectId,
    setProjectId,
    projects,
    refreshProjects,
    selectProjectById,
    createProjectAndSelect,
    initError,
    setInitError,
    isProjectNotFoundError,
    ensureActiveProject,
  } = useHomeProject();

  const {
    nodeTypes,
    runBootstrap,
    runTestChatNode,
    restoreLatestTab,
    getWorkspaceTabs,
    createTab,
    selectTab,
    cancelStream,
  } = useHomeBootstrapRunner({
    setNodes,
    nodeSeq,
    msgSeq,
    projectId,
    setProjectId,
    setInitError,
    isProjectNotFoundError,
    ensureActiveProject,
  });

  const ensureProjectID = async (targetProjectID?: string) => {
    const ensured = await ensureActiveProject(targetProjectID);
    const activeProjectID = (ensured.projectId ?? "").trim();
    if (!activeProjectID) {
      throw new Error("EnsureProject did not return project_id");
    }
    return activeProjectID;
  };

  const refreshWorkspaceTabs = async (activeProjectID: string) => {
    const { tabs: nextTabs, activeTabId: nextActiveTabId } =
      await getWorkspaceTabs(activeProjectID);
    setTabs(nextTabs);
    setActiveTabId(nextActiveTabId);
  };

  const resetBootstrapScene = () => {
    setNodes([]);
    nodeSeq.current = 1;
    msgSeq.current = 1;
  };

  const {
    restoreStatus,
    clearRestoreStatus,
    restoreForProject,
    restoreForSelectedTab,
    restoreForNewTab,
  } = useUiRestore({
    resetBootstrapScene,
    restoreLatestTab,
    runBootstrap,
    refreshWorkspaceTabs,
  });

  const runBootstrapForProject = async (targetProjectID?: string) => {
    const activeProjectID = await ensureProjectID(targetProjectID);
    await restoreForProject(activeProjectID);
    await refreshProjects();
    return activeProjectID;
  };

  useEffect(() => {
    if (initializedRef.current || initializingRef.current) return;
    initializedRef.current = true;
    initializingRef.current = true;

    void (async () => {
      try {
        await runBootstrapForProject(projectId ?? undefined);
      } catch (err) {
        setInitError(err instanceof Error ? err.message : String(err));
      } finally {
        initializingRef.current = false;
      }
    })();

    return () => {
      cancelStream();
    };
  }, [cancelStream, setInitError]);

  const onSelectProject = async (targetProjectID: string) => {
    const normalized = (targetProjectID ?? "").trim();
    if (!normalized) return;
    if (initializingRef.current) return;
    initializingRef.current = true;
    setInitError(null);
    clearRestoreStatus();
    try {
      await selectProjectById(normalized);
      await runBootstrapForProject(normalized);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : String(err));
    } finally {
      initializingRef.current = false;
    }
  };

  const onCreateProject = async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    setInitError(null);
    clearRestoreStatus();
    try {
      const createdProjectID = await createProjectAndSelect();
      await runBootstrapForProject(createdProjectID);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : String(err));
    } finally {
      initializingRef.current = false;
    }
  };

  const onCreateChatNode = async () => {
    if (initializingRef.current) return;
    setInitError(null);
    try {
      const activeProjectID = await ensureProjectID(projectId ?? undefined);
      await runTestChatNode(activeProjectID);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : String(err));
    }
  };

  const onSelectTab = async (tabID: string) => {
    const tid = (tabID ?? "").trim();
    if (!tid || initializingRef.current) return;
    initializingRef.current = true;
    setInitError(null);
    clearRestoreStatus();
    try {
      const activeProjectID = await ensureProjectID(projectId ?? undefined);
      await selectTab(activeProjectID, tid);
      await restoreForSelectedTab(activeProjectID, tid);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : String(err));
    } finally {
      initializingRef.current = false;
    }
  };

  const onCreateTab = async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    setInitError(null);
    clearRestoreStatus();
    try {
      const activeProjectID = await ensureProjectID(projectId ?? undefined);
      const newTabID = await createTab(activeProjectID);
      await restoreForNewTab(activeProjectID, newTabID);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : String(err));
    } finally {
      initializingRef.current = false;
    }
  };

  return {
    nodeTypes,
    projectId,
    projects,
    tabs,
    activeTabId,
    restoreStatus,
    initError,
    onSelectProject,
    onCreateProject,
    onCreateChatNode,
    onSelectTab,
    onCreateTab,
  };
}
