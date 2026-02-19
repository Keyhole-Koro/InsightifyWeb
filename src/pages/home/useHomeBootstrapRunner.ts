import { type MutableRefObject } from "react";
import { type Node } from "reactflow";

import { useInteractionFlow } from "@/features/interaction/hooks/useInteractionFlow";
import {
  createUiTab,
  getUiWorkspace,
  restoreUi,
  selectUiTab,
} from "@/features/ui/api";
import { useUiNodeState } from "@/features/ui/hooks/useUiNodeState";
import { useUiNodeSync } from "@/features/ui/hooks/useUiNodeSync";
import type { UiWorkspaceTab } from "@/contracts/ui";
import type { LLMInputNodeData } from "@/features/worker/types/graphTypes";
import { useUiRestoreCache } from "./useUiRestoreCache";

const BOOTSTRAP_WORKER_KEY = "bootstrap";
const TEST_CHAT_WORKER_KEY = "testllmChatNode";

const isResolvedRestore = (reason?: string, found?: boolean): boolean => {
  if ((reason ?? "").trim() === "UI_RESTORE_REASON_RESOLVED") {
    return true;
  }
  return Boolean(found);
};

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
  const {
    getStoredTabId,
    setStoredTabId,
    clearDocumentCache,
    resolveDocument,
    saveDocumentCache,
  } = useUiRestoreCache();

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
  ): Promise<{
    restored: boolean;
    runId: string;
    tabId: string;
    source: "server" | "local_cache";
  }> => {
    const defaultTabID = (preferredTabID ?? getStoredTabId(activeProjectID)).trim();
    const res = await restoreUi({
      projectId: activeProjectID,
      tabId: defaultTabID || undefined,
    });
    const runID = (res.runId ?? res.document?.runId ?? "").trim();
    if (!isResolvedRestore(res.reason, res.found) || !runID) {
      setStoredTabId(activeProjectID, "");
      if (defaultTabID) {
        clearDocumentCache(activeProjectID, defaultTabID);
      }
      return { restored: false, runId: "", tabId: "", source: "server" };
    }
    const activeTabID = (res.tabId ?? defaultTabID).trim();
    setStoredTabId(activeProjectID, activeTabID);
    const resolved = resolveDocument({
      projectId: activeProjectID,
      tabId: activeTabID,
      runId: runID,
      serverDocument: res.document,
      serverHash: res.documentHash,
    });
    const doc = resolved.document;
    const nodes = doc?.nodes ?? [];
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
    saveDocumentCache(activeProjectID, activeTabID, runID, resolved.documentHash, doc);
    return {
      restored: true,
      runId: runID,
      tabId: activeTabID,
      source: resolved.source,
    };
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
