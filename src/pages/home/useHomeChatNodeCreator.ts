import { UI_NODE_TYPE, type UiNode } from "@/contracts/ui";
import { createNodeInTab, restoreUi, selectUiTab } from "@/features/ui/api";
import { isResolvedRestore, normalizeRestoreReason, restoreReasonDescription } from "./restoreReason";

const TEST_CHAT_WORKER_KEY = "testllmChatNode";

interface UseHomeChatNodeCreatorOptions {
  getStoredTabId: (projectId: string) => string;
  startWorkerRun: (
    workerKey: string,
    activeProjectId: string,
    params?: Record<string, string>,
  ) => Promise<string>;
  upsertNodeFromRpc: (targetNodeID: string, node: UiNode) => void;
  setNodeRunId: (nodeId: string, runId: string, version?: number) => void;
  initInteractionNode: (runId: string, nodeId: string) => Promise<void>;
}

export function useHomeChatNodeCreator({
  getStoredTabId,
  startWorkerRun,
  upsertNodeFromRpc,
  setNodeRunId,
  initInteractionNode,
}: UseHomeChatNodeCreatorOptions) {
  const isLlmChatNode = (node: UiNode): boolean => {
    return node.type === UI_NODE_TYPE.LLM_CHAT;
  };

  const ensureConversationRun = async (
    activeProjectID: string,
    preferredTabID: string,
    nodeID: string,
  ): Promise<string> => {
    const res = await restoreUi({
      projectId: activeProjectID,
      tabId: preferredTabID || undefined,
    });
    const restoredRunID = (res.runId ?? res.document?.runId ?? "").trim();
    const hasLlmChat = (res.document?.nodes ?? []).some(isLlmChatNode);
    if (isResolvedRestore(res.reason) && restoredRunID && hasLlmChat) {
      return restoredRunID;
    }
    if (preferredTabID) {
      await selectUiTab({
        projectId: activeProjectID,
        tabId: preferredTabID,
      });
    }
    return await startWorkerRun(TEST_CHAT_WORKER_KEY, activeProjectID, {
      node_id: nodeID,
    });
  };

  const runTestChatNode = async (activeProjectID: string) => {
    const preferredTabID = getStoredTabId(activeProjectID).trim();
    const requestedNodeID = `llm-chat-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const ensuredRunID = await ensureConversationRun(activeProjectID, preferredTabID, requestedNodeID);
    const createNode: UiNode = {
      id: requestedNodeID,
      type: UI_NODE_TYPE.LLM_CHAT,
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
    const runID = (res.runId ?? "").trim() || ensuredRunID;
    const nodeID = (res.nodeId ?? "").trim();
    if (!isResolvedRestore(res.reason) || !runID || !nodeID) {
      throw new Error(
        `CreateNodeInTab failed: reason=${normalizeRestoreReason(res.reason)} (${restoreReasonDescription(res.reason)}) / raw=${String(res.reason ?? "unknown")} / tab=${res.tabId ?? "-"} / run=${runID || "-"}`,
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
    runTestChatNode,
  };
}
