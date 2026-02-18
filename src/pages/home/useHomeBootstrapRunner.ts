import { type MutableRefObject } from "react";
import { type Node } from "reactflow";

import { useInteractionFlow } from "@/features/interaction/hooks/useInteractionFlow";
import {
  createUiTab,
  getProjectUiDocument,
  getUiWorkspace,
  selectUiTab,
} from "@/features/ui/api";
import { useUiNodeState } from "@/features/ui/hooks/useUiNodeState";
import { useUiNodeSync } from "@/features/ui/hooks/useUiNodeSync";
import type { UiWorkspaceTab } from "@/contracts/ui";
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

  const restoreLatestTab = async (
    activeProjectID: string,
    preferredTabID?: string,
  ): Promise<boolean> => {
    const defaultTabID = (preferredTabID ?? getStoredTabId(activeProjectID)).trim();
    const res = await getProjectUiDocument({
      projectId: activeProjectID,
      tabId: defaultTabID || undefined,
    });
    if (!res.found) {
      setStoredTabId(activeProjectID, "");
      return false;
    }
    const activeTabID = (res.tabId ?? defaultTabID).trim();
    setStoredTabId(activeProjectID, activeTabID);
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

  const getWorkspaceTabs = async (
    activeProjectID: string,
  ): Promise<{ tabs: UiWorkspaceTab[]; activeTabId: string }> => {
    const res = await getUiWorkspace({ projectId: activeProjectID });
    const tabs = res.tabs ?? [];
    const activeTabId = (res.workspace?.activeTabId ?? "").trim();
    return { tabs, activeTabId };
  };

  const createTab = async (activeProjectID: string, title?: string) => {
    const res = await createUiTab({
      projectId: activeProjectID,
      title: (title ?? "").trim() || "Tab",
    });
    const tabId = (res.tab?.tabId ?? "").trim();
    if (!tabId) {
      throw new Error("CreateTab did not return tab_id");
    }
    setStoredTabId(activeProjectID, tabId);
    return tabId;
  };

  const selectTab = async (activeProjectID: string, tabID: string) => {
    const tid = (tabID ?? "").trim();
    if (!tid) {
      throw new Error("tab_id is required");
    }
    await selectUiTab({
      projectId: activeProjectID,
      tabId: tid,
    });
    setStoredTabId(activeProjectID, tid);
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
    getWorkspaceTabs,
    createTab,
    selectTab,
  };
}
