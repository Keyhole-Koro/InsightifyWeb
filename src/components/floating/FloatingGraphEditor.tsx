import { useState } from "react";
import { Paper, IconButton, Box, Typography } from "@mui/material";
import { GraphEditor } from "@/components/graph/GraphEditor/GraphEditor";
import { Graph } from "@/types/graphTypes";
import { ExpandIcon, CollapseIcon } from "@/components/icons";

interface FloatingGraphEditorProps {
  initialGraph: Graph;
  streamingLog?: string | null;
}

export const FloatingGraphEditor = ({
  initialGraph,
  streamingLog,
}: FloatingGraphEditorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const width = isExpanded ? "80vw" : streamingLog ? 360 : 56;
  const height = isExpanded ? "80vh" : 56;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 24,
        left: 24,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
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
            minHeight: "300px",
          }}
        >
          <GraphEditor initialGraph={initialGraph} />
        </Box>

        <IconButton
          onClick={() => setIsExpanded(!isExpanded)}
          color="primary"
          sx={{
            position: "absolute",
            bottom: 8,
            left: 8,
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
