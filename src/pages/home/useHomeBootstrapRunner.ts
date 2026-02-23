import { type MutableRefObject } from "react";
import { type Node } from "reactflow";

import { useInteractionFlow } from "@/features/interaction/hooks/useInteractionFlow";
import {
  createUiTab,
  createNodeInTab,
  getUiWorkspace,
  restoreUi,
  selectUiTab,
} from "@/features/ui/api";
import { useUiNodeState } from "@/features/ui/hooks/useUiNodeState";
import { useUiNodeSync } from "@/features/ui/hooks/useUiNodeSync";
import type { UiNode, UiWorkspaceTab } from "@/contracts/ui";
import type { LLMInputNodeData } from "@/features/worker/types/graphTypes";
import { useUiRestoreCache } from "./useUiRestoreCache";

const BOOTSTRAP_WORKER_KEY = "bootstrap";
const FEW_RESTORED_NODES_THRESHOLD = 3;
const MESSAGE_PREVIEW_MAX = 80;

const isResolvedRestore = (reason?: unknown): boolean => {
  return reason === "UI_RESTORE_REASON_RESOLVED";
};

const summarizeRestoredNodes = (nodes: Array<{
  id?: string;
  type?: string | number;
  meta?: { title?: string };
  llmChat?: { messages?: Array<{ content?: string }> };
}>) => {
  return nodes.map((node, index) => {
    const lastMessage =
      node.llmChat?.messages && node.llmChat.messages.length > 0
        ? (node.llmChat.messages[node.llmChat.messages.length - 1]?.content ?? "")
        : "";
    const lastMessagePreview =
      lastMessage.length > MESSAGE_PREVIEW_MAX
        ? `${lastMessage.slice(0, MESSAGE_PREVIEW_MAX)}...`
        : lastMessage;
    return {
      index,
      id: (node.id ?? "").trim() || null,
      type: node.type ?? null,
      title: (node.meta?.title ?? "").trim() || null,
      messageCount: node.llmChat?.messages?.length ?? 0,
      lastMessagePreview: lastMessagePreview || null,
    };
  });
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
    console.debug("[ui-restore] restore response", {
      projectId: activeProjectID,
      requestedTabId: defaultTabID || null,
      reason: res.reason,
      tabId: res.tabId ?? null,
      runId: res.runId ?? null,
      documentHash: res.documentHash ?? null,
      serverNodeCount: res.document?.nodes?.length ?? 0,
    });
    const runID = (res.runId ?? res.document?.runId ?? "").trim();
    if (!isResolvedRestore(res.reason) || !runID) {
      setStoredTabId(activeProjectID, "");
      if (defaultTabID) {
        clearDocumentCache(activeProjectID, defaultTabID);
      }
      console.debug("[ui-restore] restore fallback", {
        projectId: activeProjectID,
        requestedTabId: defaultTabID || null,
        reason: res.reason,
        runId: runID,
      });
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
    const nodeDetails = summarizeRestoredNodes(nodes);
    setNodes([]);
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      const nodeID = (n.id ?? "").trim() || `restored-node-${i + 1}`;
      const normalizedNode = {
        ...n,
        id: nodeID,
      };
      upsertNodeFromRpc(nodeID, normalizedNode);
      if (runID) {
        setNodeRunId(nodeID, runID, doc?.version);
      }
    }
    saveDocumentCache(activeProjectID, activeTabID, runID, resolved.documentHash, doc);
    console.info("[ui-restore] restore applied", {
      projectId: activeProjectID,
      tabId: activeTabID,
      runId: runID,
      source: resolved.source,
      nodeCount: nodes.length,
      nodeDetails,
      documentVersion: doc?.version ?? null,
      documentHash: resolved.documentHash,
    });
    if (nodes.length < FEW_RESTORED_NODES_THRESHOLD) {
      console.warn("[ui-restore] few restored nodes", {
        projectId: activeProjectID,
        tabId: activeTabID,
        runId: runID,
        source: resolved.source,
        nodeCount: nodes.length,
        nodeDetails,
        threshold: FEW_RESTORED_NODES_THRESHOLD,
        documentVersion: doc?.version ?? null,
        documentHash: resolved.documentHash,
      });
    }
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
    const preferredTabID = getStoredTabId(activeProjectID).trim();
    const createNode: UiNode = {
      type: "UI_NODE_TYPE_LLM_CHAT",
      meta: {
        title: "LLM Chat",
      },
      llmChat: {
        model: "Low",
        isResponding: false,
        sendLocked: false,
        sendLockHint: "",
        messages: [],
      },
    };
    const res = await createNodeInTab({
      projectId: activeProjectID,
      tabId: preferredTabID || undefined,
      node: createNode,
      actor: "frontend",
    });
    const runID = (res.runId ?? "").trim();
    const nodeID = (res.nodeId ?? "").trim();
    if (res.reason !== "UI_RESTORE_REASON_RESOLVED" || !runID || !nodeID) {
      throw new Error(
        `CreateNodeInTab failed: reason=${String(res.reason ?? "unknown")} / tab=${res.tabId ?? "-"} / run=${runID || "-"}`,
      );
    }
    const createdNode = (res.document?.nodes ?? []).find(
      (n) => (n.id ?? "").trim() === nodeID,
    );
    if (!createdNode) {
      throw new Error(
        `CreateNodeInTab returned no created node in document: node_id=${nodeID}`,
      );
    }
    upsertNodeFromRpc(nodeID, createdNode);
    setNodeRunId(nodeID, runID, res.document?.version);
    console.info("[ui-node-create] created in tab", {
      projectId: activeProjectID,
      tabId: (res.tabId ?? preferredTabID) || null,
      runId: runID,
      nodeId: nodeID,
      documentVersion: res.document?.version ?? null,
      documentHash: res.documentHash ?? null,
      source: "core",
    });
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
