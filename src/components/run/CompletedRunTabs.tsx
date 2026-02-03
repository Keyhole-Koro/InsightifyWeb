import { useEffect, useMemo, useState } from "react";
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import { RunItem } from "@/hooks/useRunManager";
import { RunGraphPreview } from "@/components/run/RunGraphPreview";

interface CompletedRunTabsProps {
  runs: RunItem[];
}

const formatRunLabel = (run: RunItem) => {
  const suffix = run.id ? run.id.slice(0, 4) : "run";
  return `${run.title} #${suffix}`;
};

export const CompletedRunTabs = ({ runs }: CompletedRunTabsProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (runs.length === 0) {
      setActiveId(null);
      return;
    }

    if (!activeId || !runs.some((run) => run.clientId === activeId)) {
      setActiveId(runs[0].clientId);
    }
  }, [activeId, runs]);

  const activeRun = useMemo(
    () => runs.find((run) => run.clientId === activeId) ?? null,
    [activeId, runs],
  );

  if (runs.length === 0) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 80,
        right: 20,
        zIndex: 1100,
        pointerEvents: "auto",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: 460,
          height: "70vh",
          display: "flex",
          overflow: "hidden",
          borderRadius: 3,
        }}
      >
        <Tabs
          orientation="vertical"
          value={activeId ?? false}
          onChange={(_event, value) => setActiveId(value)}
          sx={{
            borderRight: 1,
            borderColor: "divider",
            minWidth: 140,
            maxWidth: 180,
            bgcolor: "background.default",
          }}
          variant="scrollable"
        >
          {runs.map((run) => (
            <Tab
              key={run.clientId}
              value={run.clientId}
              label={formatRunLabel(run)}
              sx={{
                alignItems: "flex-start",
                textTransform: "none",
                fontSize: "0.75rem",
                px: 1.5,
              }}
            />
          ))}
        </Tabs>
        <Box
          sx={{
            flex: 1,
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          {activeRun ? (
            <>
              <Box>
                <Typography variant="subtitle1" noWrap>
                  {activeRun.title}
                </Typography>
                <Typography
                  variant="caption"
                  color={
                    activeRun.status === "error" ? "error.main" : "text.secondary"
                  }
                >
                  {activeRun.status === "error" ? "Error" : "Completed"}
                  {activeRun.progressPercent !== undefined
                    ? ` · ${Math.round(activeRun.progressPercent)}%`
                    : ""}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" noWrap>
                {activeRun.log ?? "No log"}
              </Typography>
              <RunGraphPreview
                nodes={activeRun.nodes}
                edges={activeRun.edges}
                height="100%"
              />
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Select a run
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
