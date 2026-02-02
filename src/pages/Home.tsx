import { useCallback, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  useEdgesState,
  useNodesState,
} from "reactflow";

import { FloatingGraphEditor } from "@/pages/processingGraph";
import { sampleGraph } from "@/data/sampleGraph";
import { startRun } from "@/api/pipelineApi";

// @ts-ignore
import "reactflow/dist/style.css";

export const Home = () => {
  const [isPlanning, setIsPlanning] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const handlePlanClick = useCallback(async () => {
    setIsPlanning(true);
    try {
      const response = await startRun({
        pipelineId: "phase_DAG",
        params: { repo_name: "PoliTopics" },
      });
      const data = response.clientView?.graph || {};

      // Transform API response to React Flow format
      // Simple layout strategy: grid layout
      const newNodes = (data.nodes || []).map((n: any, i: number) => {
        // Sample styles to demonstrate various node representations
        const styles = [
          // 1. Standard Minimal
          { background: "#fff", border: "1px solid #777", borderRadius: "3px" },
          // 2. Soft Blue (Info)
          {
            background: "#e3f2fd",
            border: "1px solid #2196f3",
            color: "#0d47a1",
            borderRadius: "8px",
          },
          // 3. Soft Green (Success) with rounded corners
          {
            background: "#e8f5e9",
            border: "1px solid #4caf50",
            color: "#1b5e20",
            borderRadius: "20px",
          },
          // 4. Warning/Alert style with dashed border
          {
            background: "#fff3e0",
            border: "2px dashed #ff9800",
            color: "#e65100",
          },
          // 5. Dark Mode Card with Shadow
          {
            background: "#263238",
            color: "#eceff1",
            border: "1px solid #37474f",
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
          },
          // 6. Gradient Background
          {
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
          },
        ];

        return {
          id: n.id || n.name,
          // Simple positioning logic to avoid overlap (3 columns)
          position: { x: (i % 3) * 300, y: Math.floor(i / 3) * 150 },
          data: { label: n.label || n.name, description: n.description },
          type: "default",
          style: {
            padding: "10px",
            width: "180px",
            textAlign: "center",
            ...styles[i % styles.length],
          },
        };
      });

      const newEdges = (data.edges || []).map((e: any, i: number) => ({
        id: `e${i}`,
        source: e.from,
        target: e.to,
        animated: true,
        style: { stroke: "#555" },
      }));

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err) {
      console.error("Plan request failed", err);
    } finally {
      setIsPlanning(false);
    }
  }, [setNodes, setEdges]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        backgroundColor: "#ffffff",
      }}
    >
      <button
        type="button"
        onClick={handlePlanClick}
        disabled={isPlanning}
        style={{
          position: "absolute",
          top: "16px",
          right: "24px",
          zIndex: 10,
          padding: "8px 16px",
          fontSize: "14px",
          fontWeight: 600,
          color: "#ffffff",
          backgroundColor: isPlanning ? "#94a3b8" : "#2563eb",
          border: "none",
          borderRadius: "6px",
          cursor: isPlanning ? "not-allowed" : "pointer",
          transition: "background-color 0.2s",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        {isPlanning ? "Planning..." : "Run Plan"}
      </button>
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

      <FloatingGraphEditor initialGraph={sampleGraph} />
    </div>
  );
};
