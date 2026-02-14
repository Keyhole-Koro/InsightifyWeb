import { useEffect, useState } from "react";
import { Box, Paper } from "@mui/material";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import { RunItem } from "@/features/run/hooks/useRunManager";
import { RunGraphPreview } from "@/components/run/RunGraphPreview";

interface GraphLayersProps {
  runs: RunItem[];
  onCloseRun: (clientId: string) => void;
}

export const GraphLayers = ({ runs, onCloseRun }: GraphLayersProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (runs.length === 0) {
      setActiveId(null);
      return;
    }

    if (!activeId || !runs.some((run) => run.clientId === activeId)) {
      setActiveId(runs[0].clientId);
    }
  }, [activeId, runs]);

  const isExpanded = !isMinimized || isHovering;

  return (
    <Box
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      sx={{
        position: "absolute",
        top: "50%",
        right: 12,
        transform: "translateY(-50%)",
        zIndex: 1100,
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: isExpanded ? 460 : 0,
          height: "70vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: 3,
          border: isExpanded ? "1px solid" : "none",
          borderColor: "divider",
          boxShadow: isExpanded ? "0 18px 40px rgba(15, 23, 42, 0.18)" : "none",
          bgcolor: "background.paper",
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? "translateX(0)" : "translateX(12px)",
          pointerEvents: isExpanded ? "auto" : "none",
          transition:
            "opacity 160ms ease, transform 160ms ease, width 160ms ease",
        }}
      >
        <Box
          onWheel={(event) => event.stopPropagation()}
          sx={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            p: 2,
          }}
        >
          {runs.map((run) => (
            <RunGraphPreview
              key={run.clientId}
              isActive={run.clientId === activeId}
              onClick={() => setActiveId(run.clientId)}
              onClose={() => onCloseRun(run.clientId)}
            />
          ))}
        </Box>
      </Paper>

      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: "999px",
          bgcolor: "common.white",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <ViewSidebarIcon fontSize="small" />
      </Box>
    </Box>
  );
};
