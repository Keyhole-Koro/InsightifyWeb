import { UI_ACT_STATUS, UI_NODE_TYPE, type UiNode } from "@/contracts/ui";
import { createNodeInTab, restoreUi, selectUiTab } from "@/features/ui/api";
import { isResolvedRestore, normalizeRestoreReason, restoreReasonDescription } from "./restoreReason";

const ACT_BOOTSTRAP_WORKER_KEY = "testllmChatNode";

interface UseActNodeCreatorOptions {
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

export function useActNodeCreator({
    getStoredTabId,
    startWorkerRun,
    upsertNodeFromRpc,
    setNodeRunId,
    initInteractionNode,
}: UseActNodeCreatorOptions) {
    const ensureActRun = async (
        activeProjectID: string,
        preferredTabID: string,
        nodeID: string,
    ): Promise<string> => {
        const res = await restoreUi({
            projectId: activeProjectID,
            tabId: preferredTabID || undefined,
        });
        const restoredRunID = (res.runId ?? res.document?.runId ?? "").trim();
        if (isResolvedRestore(res.reason) && restoredRunID) {
            return restoredRunID;
        }
        if (preferredTabID) {
            await selectUiTab({
                projectId: activeProjectID,
                tabId: preferredTabID,
            });
        }
        return await startWorkerRun(ACT_BOOTSTRAP_WORKER_KEY, activeProjectID, {
            node_id: nodeID,
        });
    };

    const createActNode = async (
        activeProjectID: string,
        input: string,
    ): Promise<{ actId: string; runId: string }> => {
        const preferredTabID = getStoredTabId(activeProjectID).trim();
        const requestedNodeID = `act-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const ensuredRunID = await ensureActRun(activeProjectID, preferredTabID, requestedNodeID);

        const actNode: UiNode = {
            id: requestedNodeID,
            type: UI_NODE_TYPE.ACT,
            meta: {
                title: input.length > 40 ? `${input.slice(0, 40)}…` : input,
            },
            act: {
                actId: requestedNodeID,
                status: UI_ACT_STATUS.PLANNING,
                mode: "planning",
                goal: input,
                pendingActions: [],
                timeline: [
                    {
                        id: `evt-${Date.now()}`,
                        createdAtUnixMs: Date.now(),
                        kind: "user_input",
                        summary: input,
                    },
                ],
            },
        };

        const res = await createNodeInTab({
            projectId: activeProjectID,
            tabId: preferredTabID || undefined,
            node: actNode,
            actor: "act",
        });
        const runID = (res.runId ?? "").trim() || ensuredRunID;
        const nodeID = (res.nodeId ?? "").trim();
        if (!isResolvedRestore(res.reason) || !runID || !nodeID) {
            throw new Error(
                `CreateNodeInTab (act) failed: reason=${normalizeRestoreReason(res.reason)} (${restoreReasonDescription(res.reason)}) / raw=${String(res.reason ?? "unknown")} / tab=${res.tabId ?? "-"} / run=${runID || "-"}`,
            );
        }
        const createdNode = (res.document?.nodes ?? []).find(
            (n) => (n.id ?? "").trim() === nodeID,
        );
        if (!createdNode) {
            throw new Error(
                `CreateNodeInTab (act) returned no created node in document: node_id=${nodeID}`,
            );
        }

        upsertNodeFromRpc(nodeID, createdNode);
        setNodeRunId(nodeID, runID, res.document?.version);
        console.info("[act-node-create]", {
            projectId: activeProjectID,
            tabId: (res.tabId ?? preferredTabID) || null,
            runId: runID,
            nodeId: nodeID,
            documentVersion: res.document?.version ?? null,
            source: "act",
        });
        await initInteractionNode(runID, nodeID);

        return { actId: nodeID, runId: runID };
    };

    return {
        createActNode,
    };
}
