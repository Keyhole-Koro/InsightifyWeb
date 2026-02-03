import { useState } from "react";
import { Paper, IconButton, Box, Typography } from "@mui/material";
import { GraphEditor } from "@/components/graph/GraphEditor/GraphEditor";
import { Graph } from "@/types/graphTypes";

// Simple icons
const ExpandIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 3 21 3 21 9"></polyline>
    <polyline points="9 21 3 21 3 15"></polyline>
    <line x1="21" y1="3" x2="14" y2="10"></line>
    <line x1="3" y1="21" x2="10" y2="14"></line>
  </svg>
);

const CollapseIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="4 14 10 14 10 20"></polyline>
    <polyline points="20 10 14 10 14 4"></polyline>
    <line x1="14" y1="10" x2="21" y2="3"></line>
    <line x1="3" y1="21" x2="10" y2="14"></line>
  </svg>
);

interface FloatingGraphEditorProps {
  initialGraph: Graph;
  streamingLog?: string | null;
  position?: "top-left" | "bottom-right";
}

export const FloatingGraphEditor = ({
  initialGraph,
  streamingLog,
  position = "bottom-right",
}: FloatingGraphEditorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const width = isExpanded ? "80vw" : streamingLog ? 360 : 56;
  const height = isExpanded ? "80vh" : 56;

  const positionStyles =
    position === "top-left"
      ? { top: 24, left: 24, alignItems: "flex-start" }
      : { bottom: 24, right: 24, alignItems: "flex-end" };

  const buttonPosition =
    position === "top-left" ? { bottom: 8, left: 8 } : { bottom: 8, right: 8 };

  return (
    <Box
      sx={{
        position: "absolute",
        ...positionStyles,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        pointerEvents: "none",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width,
          height,
          transition: "all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)",
          overflow: "hidden",
          borderRadius: 4,
          position: "relative",
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
        }}
      >
        {streamingLog && (
          <Box
            sx={{
              height: 56,
              display: "flex",
              alignItems: "center",
              pl: isExpanded ? 2 : 7,
              pr: 2,
              borderBottom: isExpanded ? "1px solid" : "none",
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
              {streamingLog}
            </Typography>
          </Box>
        )}
        <Box
          sx={{
            flex: 1,
            width: "100%",
            opacity: isExpanded ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
            pointerEvents: isExpanded ? "auto" : "none",
            minHeight: isExpanded ? "300px" : 0,
          }}
        >
          <GraphEditor initialGraph={initialGraph} />
        </Box>

        <IconButton
          onClick={() => setIsExpanded(!isExpanded)}
          color="primary"
          sx={{
            position: "absolute",
            ...buttonPosition,
            zIndex: 10,
            bgcolor: isExpanded ? "rgba(255,255,255,0.9)" : "transparent",
            "&:hover": {
              bgcolor: isExpanded ? "rgba(255,255,255,1)" : "rgba(0,0,0,0.04)",
            },
            boxShadow: isExpanded ? 1 : 0,
          }}
        >
          {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
        </IconButton>
      </Paper>
    </Box>
  );
};
