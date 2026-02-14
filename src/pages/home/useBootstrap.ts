import { useEffect, useRef, type MutableRefObject } from "react";
import { type Node } from "reactflow";

import { useInteractionFlow } from "@/features/interaction/hooks/useInteractionFlow";
import { useUiNodeSync } from "@/features/ui/hooks/useUiNodeSync";
import { useRunSession } from "@/features/project/hooks/useRunSession";
import { useUiNodeState } from "@/features/ui/hooks/useUiNodeState";
import type { LLMInputNodeData } from "@/features/worker/types/graphTypes";

const BOOTSTRAP_NODE_ID = "init-purpose-node";
const BOOTSTRAP_WORKER_KEY = "bootstrap";
const TEST_CHAT_WORKER_KEY = "testllmChatNode";
const DEFAULT_USER_ID = "demo-user";
const DEFAULT_REPO_URL = "https://github.com/Keyhole-Koro/PoliTopics.git";
const PROJECT_STORAGE_KEY = "insightify.active_project_id";

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
    reinitProject,
  } = useRunSession({
    storageKey: PROJECT_STORAGE_KEY,
    defaultUserId: DEFAULT_USER_ID,
    defaultRepoUrl: DEFAULT_REPO_URL,
    defaultProjectName: "Project",
  });

  const nodeState = useUiNodeState(setNodes);
  const { nodeTypes, bindHandlers, upsertNodeFromRpc } = useUiNodeSync({
    setNodes,
    nodeSeq,
  });

  const { startWorkerRun, streamToNode, cancelStream } = useInteractionFlow({
    projectId,
    setProjectId,
    setInitError,
    reinitProject,
    isProjectNotFoundError,
    msgSeq,
    nodeState,
    upsertNodeFromRpc,
    bindHandlers,
  });

  const runBootstrapForProject = async (targetProjectID?: string) => {
    setNodes([]);
    nodeSeq.current = 1;
    msgSeq.current = 1;
    const res = await reinitProject(targetProjectID);
    const activeProjectID = (res.projectId ?? "").trim();
    if (!activeProjectID) {
      throw new Error("InitRun did not return project_id");
    }
    const bootstrapRunId = await startWorkerRun(
      BOOTSTRAP_WORKER_KEY,
      activeProjectID,
    );
    await streamToNode(bootstrapRunId, BOOTSTRAP_NODE_ID, activeProjectID);
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
      let activeProjectID = (projectId ?? "").trim();
      if (!activeProjectID) {
        const res = await reinitProject();
        activeProjectID = (res.projectId ?? "").trim();
      }
      if (!activeProjectID) {
        throw new Error("InitRun did not return project_id");
      }
      const runID = await startWorkerRun(TEST_CHAT_WORKER_KEY, activeProjectID);
      const nodeID = `test-llm-chat-node-${runID}`;
      await streamToNode(runID, nodeID, activeProjectID);
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
