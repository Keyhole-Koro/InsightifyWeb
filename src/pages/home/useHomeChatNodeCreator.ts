import type { UiNode } from "@/contracts/ui";
import { createNodeInTab } from "@/features/ui/api";
import { isResolvedRestore, normalizeRestoreReason, restoreReasonDescription } from "./restoreReason";

interface UseHomeChatNodeCreatorOptions {
  getStoredTabId: (projectId: string) => string;
  upsertNodeFromRpc: (targetNodeID: string, node: UiNode) => void;
  setNodeRunId: (nodeId: string, runId: string, version?: number) => void;
  initInteractionNode: (runId: string, nodeId: string) => Promise<void>;
}

export function useHomeChatNodeCreator({
  getStoredTabId,
  upsertNodeFromRpc,
  setNodeRunId,
  initInteractionNode,
}: UseHomeChatNodeCreatorOptions) {
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
