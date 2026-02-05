import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReactFlow, { Background } from "reactflow";
import { Node, Edge } from "reactflow";

type RunGraphPreviewProps = {
  nodes?: Node[];
  edges?: Edge[];
  run?: { nodes?: Node[]; edges?: Edge[] };
  height?: number | string;
  isActive?: boolean;
  onClick?: () => void;
  onClose?: () => void;
};

export const RunGraphPreview = ({
  nodes,
  edges,
  run,
  height = 220,
  isActive = false,
  onClick,
  onClose,
}: RunGraphPreviewProps) => {
  const resolvedNodes = run?.nodes ?? nodes ?? [];
  const resolvedEdges = run?.edges ?? edges ?? [];

  if (resolvedNodes.length === 0 && resolvedEdges.length === 0) {
    return (
      <Box
        sx={{
          height,
          position: "relative",
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
        {onClose ? (
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              color: "text.secondary",
              "&:hover": { color: "text.primary" },
            }}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        ) : null}
        <Typography variant="body2">Waiting for graph...</Typography>
      </Box>
    );
  }

  return (
    <Box
      onClick={onClick}
      sx={{
        height,
        width: "100%",
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: isActive ? "primary.main" : "divider",
        boxShadow: isActive ? "0 12px 24px rgba(15, 23, 42, 0.16)" : "none",
        position: "relative",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {onClose ? (
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          sx={{
            position: "absolute",
            top: 6,
            right: 6,
            zIndex: 2,
            color: "text.secondary",
            bgcolor: "background.paper",
            "&:hover": { color: "text.primary" },
          }}
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      ) : null}
      <ReactFlow
        nodes={resolvedNodes}
        edges={resolvedEdges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={16} />
      </ReactFlow>
    </Box>
  );
};
