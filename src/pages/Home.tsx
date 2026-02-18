import { useMemo, useRef } from "react";
import { useEdgesState, useNodesState } from "reactflow";

import { FloatingNodeSamples } from "@/components/floating";
import { HomeShell } from "@/components/home/HomeShell";
import type { LLMInputNodeData } from "@/features/worker/types/graphTypes";
import { ActionPanel } from "./home/ActionPanel";
import { useBootstrap } from "./home/useBootstrap";

export const Home = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<LLMInputNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nodeSeq = useRef(1);
  const msgSeq = useRef(1);

  const {
    nodeTypes,
    projectId,
    projects,
    tabs,
    activeTabId,
    initError,
    onSelectProject,
    onCreateProject,
    onSelectTab,
    onCreateTab,
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
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectProject={onSelectProject}
            onCreateProject={onCreateProject}
            onSelectTab={onSelectTab}
            onCreateTab={onCreateTab}
            onCreateChatNode={onCreateChatNode}
            initError={initError}
          />
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
