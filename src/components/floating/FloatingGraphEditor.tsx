import { Box, Typography } from "@mui/material";
import { GraphEditor } from "@/components/graph/GraphEditor/GraphEditor";
import { Graph } from "@/features/worker/types/graphTypes";
import { ExpandableCard } from "@/components/ui/ExpandableCard";

interface FloatingGraphEditorProps {
  initialGraph: Graph;
  streamingLog?: string | null;
}

export const FloatingGraphEditor = ({
  initialGraph,
  streamingLog,
}: FloatingGraphEditorProps) => {
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
      <Box sx={{ pointerEvents: "auto" }}>
        <ExpandableCard
          collapsedWidth={streamingLog ? 360 : 56}
          header={
            streamingLog && (
              <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                {streamingLog}
              </Typography>
            )
          }
        >
          <GraphEditor initialGraph={initialGraph} />
        </ExpandableCard>
      </Box>
    </Box>
  );
};
