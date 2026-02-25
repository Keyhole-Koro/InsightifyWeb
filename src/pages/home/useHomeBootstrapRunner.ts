import { useInteractionFlow } from "@/features/interaction/hooks/useInteractionFlow";
import { useUiNodeSync } from "@/features/ui/hooks/useUiNodeSync";
import { useActSelection } from "@/features/act/hooks/useActSelection";
import { routeInputToAct } from "@/features/act/model/routeInputToAct";
import { useActNodeCreator } from "./useActNodeCreator";
import type { UseHomeBootstrapRunnerOptions } from "./homeBootstrapTypes";
import { useHomeRestoreRunner } from "./useHomeRestoreRunner";
import { useHomeWorkspaceTabs } from "./useHomeWorkspaceTabs";
import { useUiRestoreCache } from "./useUiRestoreCache";
import { useCallback } from "react";

const BOOTSTRAP_WORKER_KEY = "bootstrap";

export function useHomeBootstrapRunner({
  setNodes,
  nodeSeq,
  setInitError,
}: UseHomeBootstrapRunnerOptions) {
  const restoreCache = useUiRestoreCache();
  const { selectedActId, selectAct } = useActSelection();

  const { nodeTypes, appendActTimelineEvent, upsertNodeFromRpc } = useUiNodeSync({
    setNodes,
    nodeSeq,
    selectedActId,
    onActSelect: selectAct,
  });

  const {
    startWorkerRun,
    initInteractionNode,
    setNodeRunId,
    submitNodeInput,
    cancelStream,
  } =
    useInteractionFlow({
      setInitError,
      appendActTimelineEvent,
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
      await submitNodeInput(route.actId, route.input);
    }
  }, [selectedActId, createActNode, selectAct, submitNodeInput]);

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
    sendToAct,
  };
}
