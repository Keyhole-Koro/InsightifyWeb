import { useEffect, useRef, type MutableRefObject } from "react";
import { type Node } from "reactflow";

import type { LLMInputNodeData } from "@/features/worker/types/graphTypes";
import { useHomeBootstrapRunner } from "./useHomeBootstrapRunner";
import { useHomeProject } from "./useHomeProject";

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

  const { nodeTypes, runBootstrap, runTestChatNode, restoreLatestTab, cancelStream } =
    useHomeBootstrapRunner({
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

  const bootstrapProject = async (targetProjectID?: string) => {
    const activeProjectID = await ensureProjectID(targetProjectID);
    const restored = await restoreLatestTab(activeProjectID);
    if (!restored) {
      await runBootstrap(activeProjectID);
    }
    await refreshProjects();
    return activeProjectID;
  };

  const resetBootstrapScene = () => {
    setNodes([]);
    nodeSeq.current = 1;
    msgSeq.current = 1;
  };

  const runBootstrapForProject = async (targetProjectID?: string) => {
    resetBootstrapScene();
    return await bootstrapProject(targetProjectID);
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

  return {
    nodeTypes,
    projectId,
    projects,
    initError,
    onSelectProject,
    onCreateProject,
    onCreateChatNode,
  };
}
