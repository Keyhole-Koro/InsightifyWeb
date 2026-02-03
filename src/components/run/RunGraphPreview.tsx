import { Box, Typography } from "@mui/material";
import ReactFlow, { Background } from "reactflow";
import { Node, Edge } from "reactflow";

interface RunGraphPreviewProps {
  nodes: Node[];
  edges: Edge[];
  height?: number | string;
}

export const RunGraphPreview = ({
  nodes,
  edges,
  height = 220,
}: RunGraphPreviewProps) => {
  if (nodes.length === 0 && edges.length === 0) {
    return (
      <Box
        sx={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 2,
          color: "text.secondary",
          bgcolor: "background.default",
        }}
      >
        <Typography variant="body2">Waiting for graph...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height,
        width: "100%",
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={16} />
      </ReactFlow>
    </Box>
  );
};
