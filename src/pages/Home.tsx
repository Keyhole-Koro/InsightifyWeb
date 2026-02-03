import { useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  useEdgesState,
  useNodesState,
} from "reactflow";

import { FloatingNodeSamples } from "@/components/floating";
import { CompletedRunTabs, WatchRunViewer } from "@/components/run";
import { ActionButton } from "@/components/ui/ActionButton";
import { useRunManager } from "@/hooks/useRunManager";

import "reactflow/dist/style.css";

export const Home = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { inProgress, completed, runPlan, runStreaming } = useRunManager({
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
        variant="primary"
        style={{ position: "absolute", top: 16, right: 24, zIndex: 10 }}
      >
        Run Plan
      </ActionButton>

      <ActionButton
        onClick={handleTestStreaming}
        variant="success"
        style={{ position: "absolute", top: 16, right: 140, zIndex: 10 }}
      >
        Test Streaming
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

      <WatchRunViewer runs={inProgress} />
      <CompletedRunTabs runs={completed} />
      <FloatingNodeSamples />
    </div>
  );
};
