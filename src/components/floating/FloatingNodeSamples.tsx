import { useState } from "react";
import { Paper, IconButton, Box } from "@mui/material";
import { GraphEditor } from "@/components/graph/GraphEditor/GraphEditor";
import { Graph } from "@/types/graphTypes";
import { PaletteIcon, CloseIcon } from "@/components/icons";

export const FloatingNodeSamples = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const sampleGraph: Graph = {
    id: "sample-graph",
    nodes: [
      { id: "sample-1", label: "Default Node", description: "Standard appearance", position: { x: 0, y: 0 } },
      { id: "sample-2", label: "Success Node", description: "Green background", position: { x: 0, y: 100 }, data: { style: { backgroundColor: "#dcfce7", borderColor: "#22c55e" } } },
      { id: "sample-3", label: "Warning Node", description: "Yellow background", position: { x: 0, y: 200 }, data: { style: { backgroundColor: "#fef9c3", borderColor: "#eab308" } } },
      { id: "sample-4", label: "Error Node", description: "Red background", position: { x: 0, y: 300 }, data: { style: { backgroundColor: "#fee2e2", borderColor: "#ef4444" } } },
      { id: "sample-5", label: "Dark Node", description: "Dark mode style", position: { x: 0, y: 400 }, data: { style: { backgroundColor: "#1f2937", borderColor: "#000", color: "#f3f4f6" } } },
    ],
    edges: [],
  };

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: isExpanded ? "40vw" : 56,
          height: isExpanded ? "50vh" : 56,
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
        <Box sx={{ flex: 1, width: "100%", height: "100%", opacity: isExpanded ? 1 : 0, transition: "opacity 0.3s" }}>
          <GraphEditor initialGraph={sampleGraph} />
        </Box>

        <IconButton
          onClick={() => setIsExpanded(!isExpanded)}
          color="primary"
          sx={{
            position: "absolute",
            bottom: 8,
            right: 8,
            zIndex: 10,
            bgcolor: isExpanded ? "rgba(255,255,255,0.9)" : "transparent",
            "&:hover": { bgcolor: isExpanded ? "rgba(255,255,255,1)" : "rgba(0,0,0,0.04)" },
            boxShadow: isExpanded ? 1 : 0,
          }}
        >
          {isExpanded ? <CloseIcon /> : <PaletteIcon />}
        </IconButton>
      </Paper>
    </Box>
  );
};