import { type MutableRefObject } from "react";
import { type Node } from "reactflow";

import { useInteractionFlow } from "@/features/interaction/hooks/useInteractionFlow";
import { getProjectUiDocument } from "@/features/ui/api";
import { useUiNodeState } from "@/features/ui/hooks/useUiNodeState";
import { useUiNodeSync } from "@/features/ui/hooks/useUiNodeSync";
import type { LLMInputNodeData } from "@/features/worker/types/graphTypes";

const BOOTSTRAP_WORKER_KEY = "bootstrap";
const TEST_CHAT_WORKER_KEY = "testllmChatNode";
const PROJECT_TAB_STORAGE_PREFIX = "insightify.ui_tab_id.";

interface UseHomeBootstrapRunnerOptions {
  setNodes: React.Dispatch<React.SetStateAction<Node<LLMInputNodeData>[]>>;
  nodeSeq: MutableRefObject<number>;
  msgSeq: MutableRefObject<number>;
  projectId: string | null;
  setProjectId: (value: string | null) => void;
  setInitError: (value: string | null) => void;
  isProjectNotFoundError: (message: string) => boolean;
  ensureActiveProject: () => Promise<{ projectId?: string }>;
}

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
  const getStoredTabId = (projectID: string): string => {
    const pid = (projectID ?? "").trim();
    if (!pid) {
      return "";
    }
    return (localStorage.getItem(PROJECT_TAB_STORAGE_PREFIX + pid) ?? "").trim();
  };

  const setStoredTabId = (projectID: string, tabID: string): void => {
    const pid = (projectID ?? "").trim();
    const tid = (tabID ?? "").trim();
    if (!pid) {
      return;
    }
    if (!tid) {
      localStorage.removeItem(PROJECT_TAB_STORAGE_PREFIX + pid);
      return;
    }
    localStorage.setItem(PROJECT_TAB_STORAGE_PREFIX + pid, tid);
  };

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

  const runBootstrap = async (activeProjectID: string) => {
    await startWorkerRun(BOOTSTRAP_WORKER_KEY, activeProjectID);
  };

  const restoreLatestTab = async (activeProjectID: string): Promise<boolean> => {
    const storedTabID = getStoredTabId(activeProjectID);
    const res = await getProjectUiDocument({
      projectId: activeProjectID,
      tabId: storedTabID || undefined,
    });
    if (!res.found) {
      setStoredTabId(activeProjectID, "");
      return false;
    }
    setStoredTabId(activeProjectID, (res.tabId ?? "").trim());
    const doc = res.document;
    const nodes = doc?.nodes ?? [];
    if (nodes.length === 0) {
      return false;
    }
    const runID = (res.runId ?? doc?.runId ?? "").trim();
    setNodes([]);
    for (const n of nodes) {
      const nodeID = (n.id ?? "").trim();
      if (!nodeID) {
        continue;
      }
      upsertNodeFromRpc(nodeID, n);
      if (runID) {
        setNodeRunId(nodeID, runID);
      }
    }
    return true;
  };

  const runTestChatNode = async (activeProjectID: string) => {
    const runID = await startWorkerRun(TEST_CHAT_WORKER_KEY, activeProjectID);
    const nodeID = `test-llm-chat-node-${runID}`;
    await initInteractionNode(runID, nodeID);
  };

  return {
    nodeTypes,
    cancelStream,
    runBootstrap,
    runTestChatNode,
    restoreLatestTab,
  };
}
