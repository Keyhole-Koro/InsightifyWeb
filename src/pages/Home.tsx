import { useMemo, useRef } from "react";
import { useEdgesState, useNodesState } from "reactflow";

import { FloatingNodeSamples } from "@/components/floating";
import { HomeShell } from "@/components/home/HomeShell";
import { GraphLayers, WatchRunViewer } from "@/components/run";
import { useRunManager } from "@/features/run/hooks/useRunManager";
import type { LLMInputNodeData } from "@/features/run/types/graphTypes";
import { ActionPanel } from "./home/ActionPanel";
import { useBootstrap } from "./home/useBootstrap";

export const Home = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<LLMInputNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nodeSeq = useRef(1);
  const msgSeq = useRef(1);

  const { inProgress, completed, dismissCompleted } = useRunManager();

  const {
    nodeTypes,
    projectId,
    projects,
    initError,
    onSelectProject,
    onCreateProject,
    onCreateChatNode,
  } = useBootstrap({
    setNodes,
    nodeSeq,
    msgSeq,
  });

  const isInitialized = useMemo(() => Boolean(projectId), [projectId]);

  return (
    <HomeShell
      layout={{ background: "#ffffff", showGraphBackground: true }}
      graphConfig={{
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        fitView: true,
        nodeTypes,
      }}
      slots={{
        actions: (
          <ActionPanel
            isInitialized={isInitialized}
            projectId={projectId}
            projects={projects}
            onSelectProject={onSelectProject}
            onCreateProject={onCreateProject}
            onCreateChatNode={onCreateChatNode}
            initError={initError}
          />
        ),
        runOverlay: <WatchRunViewer runs={inProgress} />,
        runSidebar: (
          <GraphLayers runs={completed} onCloseRun={dismissCompleted} />
        ),
        floating: (
          <>
            <FloatingNodeSamples />
          </>
        ),
      }}
    />
  );
};
