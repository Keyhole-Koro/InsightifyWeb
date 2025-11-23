import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from 'reactflow';

import { rootGraph } from './graphData';
import { NestedGraphContext } from './nestedFlow/context';
import { nodeTypes } from './nestedFlow/InnerFlow';
import { useNestedFlowController } from './nestedFlow/useNestedFlowController';

const NestedFlow = () => {
  const {
    nodes,
    buildNodes,
    handleAnyNodeClick,
    handleNestedNodesChange,
    handleNodesChange,
  } = useNestedFlowController();

  return (
    <NestedGraphContext.Provider
      value={{
        buildNodes,
        onNodeClick: handleAnyNodeClick,
        onNestedNodesChange: handleNestedNodesChange,
      }}
    >
      <div className="flow-shell">
        <ReactFlow
          nodes={nodes}
          edges={rootGraph.edges}
          fitView
          nodeTypes={nodeTypes}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          onNodesChange={handleNodesChange}
          onNodeClick={handleAnyNodeClick}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} color="#ececec" />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </div>
    </NestedGraphContext.Provider>
  );
};

export default NestedFlow;
