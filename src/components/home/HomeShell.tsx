import React from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeTypes,
  type OnEdgesChange,
  type OnNodesChange,
} from "reactflow";

import "reactflow/dist/style.css";

export type HomeGraphConfig = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  fitView?: boolean;
  nodeTypes?: NodeTypes;
};

export type HomeSlots = {
  actions?: React.ReactNode;
  graph?: React.ReactNode;
  runSidebar?: React.ReactNode;
  runOverlay?: React.ReactNode;
  floating?: React.ReactNode;
};

export type HomeLayoutConfig = {
  background?: string;
  showGraphBackground?: boolean;
  showGraphControls?: boolean;
};

export type HomeShellProps = {
  layout?: HomeLayoutConfig;
  graphConfig?: HomeGraphConfig;
  slots?: HomeSlots;
};

const defaultLayout: Required<HomeLayoutConfig> = {
  background: "#ffffff",
  showGraphBackground: true,
  showGraphControls: true,
};

export const HomeShell = ({
  layout,
  graphConfig,
  slots,
}: HomeShellProps) => {
  const resolvedLayout = { ...defaultLayout, ...layout };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        backgroundColor: resolvedLayout.background,
      }}
    >
      {slots?.actions}

      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {slots?.graph ??
          (graphConfig ? (
            <ReactFlow
              nodes={graphConfig.nodes}
              edges={graphConfig.edges}
              onNodesChange={graphConfig.onNodesChange}
              onEdgesChange={graphConfig.onEdgesChange}
              fitView={graphConfig.fitView}
              nodeTypes={graphConfig.nodeTypes}
              proOptions={{ hideAttribution: true }}
            >
              {resolvedLayout.showGraphBackground ? (
                <Background color="#f1f5f9" gap={16} />
              ) : null}
              {resolvedLayout.showGraphControls ? <Controls /> : null}
            </ReactFlow>
          ) : null)}
      </div>

      {slots?.runOverlay}
      {slots?.runSidebar}
      {slots?.floating}
    </div>
  );
};
