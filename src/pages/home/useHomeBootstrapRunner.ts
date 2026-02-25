import { useInteractionFlow } from "@/features/interaction/hooks/useInteractionFlow";
import { useUiNodeState } from "@/features/ui/hooks/useUiNodeState";
import { useUiNodeSync } from "@/features/ui/hooks/useUiNodeSync";
import { useActSelection } from "@/features/act/hooks/useActSelection";
import { routeInputToAct } from "@/features/act/model/routeInputToAct";
import { useActNodeCreator } from "./useActNodeCreator";
import type { UseHomeBootstrapRunnerOptions } from "./homeBootstrapTypes";
import { useHomeRestoreRunner } from "./useHomeRestoreRunner";
import { useHomeWorkspaceTabs } from "./useHomeWorkspaceTabs";
import { useUiRestoreCache } from "./useUiRestoreCache";
import { send } from "@/features/interaction/api";
import { useInteractionState } from "@/features/interaction/hooks/useInteractionState";
import { useCallback } from "react";

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
  const { selectedActId, selectAct, clearActSelection } = useActSelection();

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

  const interactionSession = useInteractionState();

  const { restoreLatestTab } = useHomeRestoreRunner({
    setNodes,
    restoreCache,
    upsertNodeFromRpc,
    setNodeRunId,
  });

  const { getWorkspaceTabs, createTab, selectTab } = useHomeWorkspaceTabs({
    setStoredTabId: restoreCache.setStoredTabId,
  });


  const { createActNode } = useActNodeCreator({
    getStoredTabId: restoreCache.getStoredTabId,
    startWorkerRun,
    upsertNodeFromRpc,
    setNodeRunId,
    initInteractionNode,
  });

  const sendToAct = useCallback(async (input: string, activeProjectId: string) => {
    const route = routeInputToAct(selectedActId, input);
    if (!route) return;

    if (route.kind === "create") {
      const { actId } = await createActNode(activeProjectId, route.input);
      selectAct(actId);
    } else {
      // Send to existing act
      const runId = interactionSession.getRunId(route.actId);
      if (!runId) {
        throw new Error(`No active run for act node: ${route.actId}`);
      }
      const interactionId = interactionSession.getPendingInteractionId(route.actId);
      await send({
        runId,
        nodeId: route.actId,
        interactionId,
        input: route.input,
      });
    }
  }, [selectedActId, createActNode, selectAct, interactionSession]);

  const runBootstrap = async (activeProjectID: string) => {
    await startWorkerRun(BOOTSTRAP_WORKER_KEY, activeProjectID);
  };

  return {
    nodeTypes,
    cancelStream,
    runBootstrap,
    restoreLatestTab,
    getWorkspaceTabs,
    createTab,
    selectTab,
    selectedActId,
    selectAct,
    clearActSelection,
    sendToAct,
  };
}
