import { useInteractionFlow } from "@/features/interaction/hooks/useInteractionFlow";
import { useUiNodeState } from "@/features/ui/hooks/useUiNodeState";
import { useUiNodeSync } from "@/features/ui/hooks/useUiNodeSync";
import { useHomeChatNodeCreator } from "./useHomeChatNodeCreator";
import type { UseHomeBootstrapRunnerOptions } from "./homeBootstrapTypes";
import { useHomeRestoreRunner } from "./useHomeRestoreRunner";
import { useHomeWorkspaceTabs } from "./useHomeWorkspaceTabs";
import { useUiRestoreCache } from "./useUiRestoreCache";

const BOOTSTRAP_WORKER_KEY = "bootstrap";

export function useHomeBootstrapRunner({
  setNodes,
  nodeSeq,
  msgSeq,
  projectId,
  setProjectId,
  setInitError,
  isProjectNotFoundError,
  ensureActiveProject,
}: UseHomeBootstrapRunnerOptions) {
  const restoreCache = useUiRestoreCache();

  const nodeState = useUiNodeState(setNodes);
  const { nodeTypes, bindHandlers, upsertNodeFromRpc } = useUiNodeSync({
    setNodes,
    nodeSeq,
  });

  const { startWorkerRun, initInteractionNode, setNodeRunId, cancelStream } =
    useInteractionFlow({
      projectId,
      setProjectId,
      setInitError,
      ensureActiveProject,
      isProjectNotFoundError,
      msgSeq,
      nodeState,
      upsertNodeFromRpc,
      bindHandlers,
    });

  const { restoreLatestTab } = useHomeRestoreRunner({
    setNodes,
    restoreCache,
    upsertNodeFromRpc,
    setNodeRunId,
  });

  const { getWorkspaceTabs, createTab, selectTab } = useHomeWorkspaceTabs({
    setStoredTabId: restoreCache.setStoredTabId,
  });

  const { runTestChatNode } = useHomeChatNodeCreator({
    getStoredTabId: restoreCache.getStoredTabId,
    startWorkerRun,
    upsertNodeFromRpc,
    setNodeRunId,
    initInteractionNode,
  });

  const runBootstrap = async (activeProjectID: string) => {
    await startWorkerRun(BOOTSTRAP_WORKER_KEY, activeProjectID);
  };

  return {
    nodeTypes,
    cancelStream,
    runBootstrap,
    runTestChatNode,
    restoreLatestTab,
    getWorkspaceTabs,
    createTab,
    selectTab,
  };
}
