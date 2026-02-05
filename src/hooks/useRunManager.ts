import { useCallback, useMemo, useRef, useState } from "react";
import { Node, Edge } from "reactflow";
import { startRun, watchRun } from "@/api/pipelineApi";
import { transformApiGraphToReactFlow } from "@/utils/graphTransform";

export type RunStatus = "running" | "complete" | "error";

export interface RunItem {
  clientId: string;
  id: string;
  pipelineId: string;
  title: string;
  status: RunStatus;
  log: string | null;
  progressPercent?: number;
  nodes: Node[];
  edges: Edge[];
  startedAt: string;
  finishedAt?: string;
}

interface UseRunManagerOptions {
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
}

const nowIso = () => new Date().toISOString();
const makeClientId = (runId: string) =>
  `${runId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const mergeNodes = (current: Node[], incoming: Node[]): Node[] => {
  if (incoming.length === 0) return current;
  const merged = new Map<string, Node>();
  for (const node of current) merged.set(node.id, node);
  for (const node of incoming) merged.set(node.id, node);
  return Array.from(merged.values());
};

const mergeEdges = (current: Edge[], incoming: Edge[]): Edge[] => {
  if (incoming.length === 0) return current;
  const merged = new Map<string, Edge>();
  for (const edge of current) merged.set(edge.id, edge);
  for (const edge of incoming) merged.set(edge.id, edge);
  return Array.from(merged.values());
};

export function useRunManager({
  onNodesChange,
  onEdgesChange,
}: UseRunManagerOptions = {}) {
  const [inProgress, setInProgress] = useState<RunItem[]>([]);
  const [completed, setCompleted] = useState<RunItem[]>([]);
  const completedClientIds = useRef(new Set<string>());

  const isRunning = useMemo(() => inProgress.length > 0, [inProgress.length]);

  const updateRun = useCallback(
    (runId: string, updater: (run: RunItem) => RunItem) => {
      setInProgress((current) =>
        current.map((run) => (run.id === runId ? updater(run) : run)),
      );
    },
    [],
  );

  const moveToCompleted = useCallback((run: RunItem, status: RunStatus) => {
    if (completedClientIds.current.has(run.clientId)) {
      return;
    }
    completedClientIds.current.add(run.clientId);
    const finishedRun: RunItem = {
      ...run,
      status,
      finishedAt: nowIso(),
    };
    setCompleted((current) => [finishedRun, ...current]);
  }, []);

  const dismissCompleted = useCallback((clientId: string) => {
    completedClientIds.current.delete(clientId);
    setCompleted((current) =>
      current.filter((run) => run.clientId !== clientId),
    );
  }, []);

  const watchExistingRun = useCallback(
    async (
      runId: string,
      pipelineId: string,
      initialNodes: Node[],
      initialEdges: Edge[],
    ) => {
      const initialRun: RunItem = {
        clientId: makeClientId(runId),
        id: runId,
        pipelineId,
        title: pipelineId,
        status: "running",
        log: "Starting...",
        nodes: initialNodes,
        edges: initialEdges,
        startedAt: nowIso(),
      };

      setInProgress((current) => [...current, initialRun]);

      for await (const event of watchRun({ runId })) {
        updateRun(runId, (run) => {
          let nodes = run.nodes;
          let edges = run.edges;

          if (event.clientView?.graph) {
            const snapshot = transformApiGraphToReactFlow(
              event.clientView.graph,
            );
            nodes = mergeNodes(run.nodes, snapshot.nodes);
            edges = mergeEdges(run.edges, snapshot.edges);
          }

          return {
            ...run,
            log: event.message ?? run.log,
            progressPercent: event.progressPercent ?? run.progressPercent,
            nodes,
            edges,
          };
        });

        if (
          event.eventType === "EVENT_TYPE_COMPLETE" ||
          event.eventType === "EVENT_TYPE_ERROR"
        ) {
          const status =
            event.eventType === "EVENT_TYPE_ERROR" ? "error" : "complete";
          setInProgress((current) => {
            const target = current.find((run) => run.id === runId);
            if (!target) return current;

            if (target.nodes.length > 0 || target.edges.length > 0) {
              onNodesChange?.(target.nodes);
              onEdgesChange?.(target.edges);
            }
            moveToCompleted(target, status);
            return current.filter((run) => run.id !== runId);
          });
          break;
        }
      }
    },
    [moveToCompleted, onEdgesChange, onNodesChange, updateRun],
  );

  const runStreaming = useCallback(
    async (pipelineId: string, params: Record<string, string> = {}) => {
      let runId = "";
      try {
        const response = await startRun({ pipelineId, params });
        runId = response.runId ?? "";
        if (!runId) throw new Error("No run_id returned");

        let initialNodes: Node[] = [];
        let initialEdges: Edge[] = [];
        if (response.clientView?.graph) {
          const snapshot = transformApiGraphToReactFlow(
            response.clientView.graph,
          );
          initialNodes = snapshot.nodes;
          initialEdges = snapshot.edges;
          onNodesChange?.(initialNodes);
          onEdgesChange?.(initialEdges);
        }

        await watchExistingRun(runId, pipelineId, initialNodes, initialEdges);
      } catch (err) {
        console.error("Streaming failed", err);
        if (runId) {
          setInProgress((current) => {
            const target = current.find((run) => run.id === runId);
            if (!target) return current;
            moveToCompleted(target, "error");
            return current.filter((run) => run.id !== runId);
          });
        }
      }
    },
    [moveToCompleted, onEdgesChange, onNodesChange, watchExistingRun],
  );

  const runPlan = useCallback(
    async (pipelineId: string, params: Record<string, string> = {}) => {
      try {
        const response = await startRun({ pipelineId, params });
        const runId = response.runId ?? "";
        let nodes: Node[] = [];
        let edges: Edge[] = [];

        if (response.clientView?.graph) {
          const snapshot = transformApiGraphToReactFlow(
            response.clientView.graph,
            { useVariedStyles: true },
          );
          nodes = snapshot.nodes;
          edges = snapshot.edges;
          onNodesChange?.(nodes);
          onEdgesChange?.(edges);
        }

        if (!runId) {
          const fallbackId = `plan-${Date.now()}`;
          const finishedRun: RunItem = {
            clientId: makeClientId(fallbackId),
            id: fallbackId,
            pipelineId,
            title: pipelineId,
            status: "complete",
            log: "Completed",
            nodes,
            edges,
            startedAt: nowIso(),
            finishedAt: nowIso(),
          };
          setCompleted((current) => [finishedRun, ...current]);
          return;
        }

        await watchExistingRun(runId, pipelineId, nodes, edges);
      } catch (err) {
        console.error("Plan request failed", err);
      }
    },
    [onEdgesChange, onNodesChange, watchExistingRun],
  );

  return {
    inProgress,
    completed,
    isRunning,
    runPlan,
    runStreaming,
    dismissCompleted,
  };
}
