import { type Node } from "reactflow";

import type { UiDocument, UiNode } from "@/contracts/ui";
import { restoreUi } from "@/features/ui/api";
import type { LLMInputNodeData } from "@/features/worker/types/graphTypes";
import type { RestoreLatestTabResult } from "./homeBootstrapTypes";
import { summarizeRestoredNodes } from "./restoreNodeSummary";
import { isResolvedRestore } from "./restoreReason";

const FEW_RESTORED_NODES_THRESHOLD = 3;

interface RestoreCacheBindings {
  getStoredTabId: (projectId: string) => string;
  setStoredTabId: (projectId: string, tabId: string) => void;
  clearDocumentCache: (projectId: string, tabId: string) => void;
  resolveDocument: (input: {
    projectId: string;
    tabId: string;
    runId: string;
    serverDocument?: UiDocument;
    serverHash?: string;
  }) => {
    document?: UiDocument;
    documentHash: string;
    source: "server" | "local_cache";
  };
  saveDocumentCache: (
    projectId: string,
    tabId: string,
    runId: string,
    documentHash: string,
    document?: UiDocument,
  ) => void;
}

interface UseHomeRestoreRunnerOptions {
  setNodes: React.Dispatch<React.SetStateAction<Node<LLMInputNodeData>[]>>;
  restoreCache: RestoreCacheBindings;
  upsertNodeFromRpc: (targetNodeID: string, node: UiNode) => void;
  setNodeRunId: (nodeId: string, runId: string, version?: number) => void;
}

export function useHomeRestoreRunner({
  setNodes,
  restoreCache,
  upsertNodeFromRpc,
  setNodeRunId,
}: UseHomeRestoreRunnerOptions) {
  const restoreLatestTab = async (
    activeProjectID: string,
    preferredTabID?: string,
  ): Promise<RestoreLatestTabResult> => {
    const defaultTabID = (preferredTabID ?? restoreCache.getStoredTabId(activeProjectID)).trim();
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
      restoreCache.setStoredTabId(activeProjectID, "");
      if (defaultTabID) {
        restoreCache.clearDocumentCache(activeProjectID, defaultTabID);
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
    restoreCache.setStoredTabId(activeProjectID, activeTabID);
    const resolved = restoreCache.resolveDocument({
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
      upsertNodeFromRpc(nodeID, {
        ...n,
        id: nodeID,
      });
      setNodeRunId(nodeID, runID, doc?.version);
    }

    restoreCache.saveDocumentCache(activeProjectID, activeTabID, runID, resolved.documentHash, doc);
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

  return {
    restoreLatestTab,
  };
}
