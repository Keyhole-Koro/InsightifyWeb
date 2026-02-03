import { useState, useCallback } from "react";
import { Node, Edge } from "reactflow";
import { startRun, watchRun } from "@/api/pipelineApi";
import { transformApiGraphToReactFlow } from "@/utils/graphTransform";

interface UsePipelineRunOptions {
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
}

export function usePipelineRun({
  onNodesChange,
  onEdgesChange,
}: UsePipelineRunOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const [streamingLog, setStreamingLog] = useState<string | null>(null);

  const runPlan = useCallback(
    async (pipelineId: string, params: Record<string, string> = {}) => {
      setIsRunning(true);
      try {
        const response = await startRun({ pipelineId, params });
        if (response.clientView?.graph) {
          const { nodes, edges } = transformApiGraphToReactFlow(
            response.clientView.graph,
            { useVariedStyles: true },
          );
          onNodesChange(nodes);
          onEdgesChange(edges);
        }
      } catch (err) {
        console.error("Plan request failed", err);
      } finally {
        setIsRunning(false);
      }
    },
    [onNodesChange, onEdgesChange],
  );

  const runStreaming = useCallback(
    async (pipelineId: string, params: Record<string, string> = {}) => {
      setIsRunning(true);
      setStreamingLog("Starting...");

      try {
        const response = await startRun({ pipelineId, params });
        const runId = response.runId;
        if (!runId) throw new Error("No run_id returned");

        for await (const event of watchRun({ runId })) {
          if (event.message) setStreamingLog(event.message);

          if (
            event.eventType === "EVENT_TYPE_COMPLETE" &&
            event.clientView?.graph
          ) {
            const { nodes, edges } = transformApiGraphToReactFlow(
              event.clientView.graph,
            );
            onNodesChange(nodes);
            onEdgesChange(edges);
          }

          if (event.eventType === "EVENT_TYPE_ERROR") {
            throw new Error(event.message || "Unknown error");
          }
        }

        setTimeout(() => setStreamingLog(null), 2000);
      } catch (err) {
        console.error("Streaming failed", err);
        setStreamingLog(
          "Error: " + (err instanceof Error ? err.message : String(err)),
        );
      } finally {
        setIsRunning(false);
      }
    },
    [onNodesChange, onEdgesChange],
  );

  return { isRunning, streamingLog, runPlan, runStreaming };
}
