import { useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  useEdgesState,
  useNodesState,
} from "reactflow";

import {
  FloatingGraphEditor,
  FloatingNodeSamples,
} from "@/components/floating";
import { ActionButton } from "@/components/ui/ActionButton";
import { sampleGraph } from "@/data/sampleGraph";
import { usePipelineRun } from "@/hooks/usePipelineRun";

import "reactflow/dist/style.css";

export const Home = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { isRunning, streamingLog, runPlan, runStreaming } = usePipelineRun({
    onNodesChange: setNodes,
    onEdgesChange: setEdges,
  });

  const handlePlanClick = useCallback(() => {
    runPlan("phase_DAG", { repo_name: "PoliTopics" });
  }, [runPlan]);

  const handleTestStreaming = useCallback(() => {
    runStreaming("test_pipeline");
  }, [runStreaming]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        backgroundColor: "#ffffff",
      }}
    >
      <ActionButton
        onClick={handlePlanClick}
        disabled={isRunning}
        variant="primary"
        style={{ position: "absolute", top: 16, right: 24, zIndex: 10 }}
      >
        {isRunning ? "Running..." : "Run Plan"}
      </ActionButton>

      <ActionButton
        onClick={handleTestStreaming}
        disabled={isRunning}
        variant="success"
        style={{ position: "absolute", top: 16, right: 140, zIndex: 10 }}
      >
        {isRunning ? "Streaming..." : "Test Streaming"}
      </ActionButton>

      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#f1f5f9" gap={16} />
          <Controls />
        </ReactFlow>
      </div>

      <FloatingGraphEditor
        initialGraph={sampleGraph}
        streamingLog={streamingLog}
      />
      <FloatingNodeSamples />
    </div>
  );
};
