import { useCallback } from "react";
import { useEdgesState, useNodesState } from "reactflow";

import { FloatingNodeSamples } from "@/components/floating";
import { GraphLayers, WatchRunViewer } from "@/components/run";
import { ActionButton } from "@/components/ui/ActionButton";
import { HomeShell } from "@/components/home/HomeShell";
import { useRunManager } from "@/hooks/useRunManager";

export const Home = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { inProgress, completed, runPlan, runStreaming, dismissCompleted } =
    useRunManager({
      onNodesChange: setNodes,
      onEdgesChange: setEdges,
    });

  const handlePlanClick = useCallback(() => {
    runPlan("worker_DAG", { repo_name: "PoliTopics" });
  }, [runPlan]);

  const handleTestStreaming = useCallback(() => {
    runStreaming("test_pipeline");
  }, [runStreaming]);

  return (
    <HomeShell
      layout={{ background: "#ffffff", showGraphBackground: true }}
      graphConfig={{
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        fitView: true,
      }}
      slots={{
        actions: (
          <>
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
          </>
        ),
        runOverlay: <WatchRunViewer runs={inProgress} />,
        runSidebar: (
          <GraphLayers runs={completed} onCloseRun={dismissCompleted} />
        ),
        floating: <FloatingNodeSamples />,
      }}
    />
  );
};
