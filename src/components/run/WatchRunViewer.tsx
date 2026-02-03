import { useMemo, useState } from "react";
import {
  Box,
  IconButton,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";
import { RunItem } from "@/hooks/useRunManager";
import { RunGraphPreview } from "@/components/run/RunGraphPreview";

const ExpandIcon = () => (
  <svg
    width="20"
    height="20"
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
    width="20"
    height="20"
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

interface WatchRunViewerProps {
  runs: RunItem[];
}

export const WatchRunViewer = ({ runs }: WatchRunViewerProps) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const orderedRuns = useMemo(() => runs, [runs]);

  if (orderedRuns.length === 0) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 20,
        left: 20,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        zIndex: 1200,
        pointerEvents: "auto",
        maxWidth: 420,
      }}
    >
      {orderedRuns.map((run) => {
        const isExpanded = Boolean(expanded[run.id]);
        const progressValue = run.progressPercent ?? 0;
        return (
          <Paper
            key={run.clientId}
            elevation={6}
            sx={{
              p: 2,
              borderRadius: 3,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              bgcolor: "background.paper",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap>
                  {run.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {run.log ?? "Running..."}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {run.progressPercent !== undefined
                    ? `${Math.round(progressValue)}%`
                    : "--"}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() =>
                    setExpanded((current) => ({
                      ...current,
                      [run.id]: !isExpanded,
                    }))
                  }
                >
                  {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                </IconButton>
              </Box>
            </Box>

            <Box>
              {run.progressPercent !== undefined ? (
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, Math.max(0, progressValue))}
                />
              ) : (
                <LinearProgress variant="indeterminate" />
              )}
            </Box>

            {isExpanded && (
              <RunGraphPreview nodes={run.nodes} edges={run.edges} height={240} />
            )}
          </Paper>
        );
      })}
    </Box>
  );
};
