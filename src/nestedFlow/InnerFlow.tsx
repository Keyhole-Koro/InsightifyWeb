import { useCallback, useContext, useMemo } from 'react';
import type { CSSProperties } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  NodeChange,
  NodeProps,
  Position,
  ReactFlowProvider,
} from 'reactflow';

import type {
  ChildGraphLayout,
  GraphData,
  NestableNodeData,
} from '../graphData';
import { CHILD_FLOW_GAP } from './constants';
import { NestedGraphContext } from './context';
import { buildChildGraphPath, extractChildGraphs } from './layout';

export const NestableNode = ({
  data,
  style,
}: NodeProps<NestableNodeData> & { style?: CSSProperties }) => {
  const {
    label,
    onExpand,
    isExpanded,
    isPrimaryExpanded,
    childGraph,
    childLayouts,
    path,
  } = data;
  const resolvedExpanded = Boolean(isExpanded);
  const resolvedPrimary = Boolean(isPrimaryExpanded);
  const childGraphs = useMemo(
    () => extractChildGraphs(childGraph),
    [childGraph],
  );

  return (
    <div
      className={[
        'nestable-node',
        resolvedExpanded ? 'expanded' : '',
        resolvedPrimary ? 'primary' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <div className="node-handle react-flow__node-drag-handle">
        <div className="node-label">{label}</div>
        <div className="node-drag-indicator" aria-hidden="true">
          ⋮⋮
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        style={{ visibility: 'hidden' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ visibility: 'hidden' }}
      />
      {resolvedExpanded &&
        childGraphs.map((graph, index) => {
          const parentPath = path ?? '';
          const childPath = buildChildGraphPath(parentPath, index);
          const layout = childLayouts?.find(
            (item) => item.path === childPath,
          );
          const childHeight = layout?.height ?? undefined;

          return (
            <div
              key={childPath}
              className="inner-flow"
              onClick={(event) => event.stopPropagation()}
              style={{
                height: childHeight,
                marginTop: index > 0 ? CHILD_FLOW_GAP : 0,
              }}
            >
              <MiniReactFlow
                graph={graph}
                parentPath={childPath}
                layout={layout}
              />
            </div>
          );
        })}
    </div>
  );
};

export const nodeTypes = { nestable: NestableNode };

export const MiniReactFlow = ({
  graph,
  parentPath,
  layout,
}: {
  graph: GraphData;
  parentPath: string;
  layout?: ChildGraphLayout;
}) => {
  const context = useContext(NestedGraphContext);
  const buildFromContext = context?.buildNodes;
  const nodes = useMemo(() => {
    const baseNodes = buildFromContext
      ? buildFromContext(graph, parentPath)
      : graph.nodes;

    return baseNodes.map((node) => {
      if (
        extractChildGraphs(node.data.childGraph).length > 0 &&
        node.type !== 'nestable'
      ) {
        return { ...node, type: 'nestable' };
      }
      return node;
    });
  }, [buildFromContext, graph, parentPath]);
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      context?.onNestedNodesChange?.(parentPath, changes, layout);
    },
    [context, layout, parentPath],
  );

  return (
    <ReactFlowProvider>
      <ReactFlow
        key={
          layout
            ? `${parentPath}:${layout.minX}:${layout.minY}:${layout.width}:${layout.height}`
            : parentPath
        }
        nodes={nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        onNodeClick={context?.onNodeClick}
        onNodesChange={handleNodesChange}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        minZoom={1}
        maxZoom={1}
        defaultViewport={{
          x: layout ? -layout.minX : 0,
          y: layout ? -layout.minY : 0,
          zoom: 1,
        }}
        proOptions={{ hideAttribution: true }}
        className="mini-flow"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
          color="rgba(0, 0, 0, 0.08)"
        />
      </ReactFlow>
    </ReactFlowProvider>
  );
};
