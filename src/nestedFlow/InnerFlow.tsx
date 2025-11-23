import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  NodeChange,
  NodeProps,
  NodeMouseHandler,
  PanOnScrollMode,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';

import type {
  ChildGraphLayout,
  GraphData,
  NestableNodeData,
} from '../graphData';
import {
  CHILD_FLOW_GAP,
  CHILD_FLOW_MAX_HEIGHT,
  CHILD_FLOW_STACK_PADDING,
  INNER_FLOW_MAX_ZOOM,
  INNER_FLOW_MIN_ZOOM,
  INNER_FLOW_ZOOM_SENSITIVITY,
} from './constants';
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
      {resolvedExpanded && (
        <div
          className="inner-flow-stack"
          style={{
            gap: CHILD_FLOW_GAP,
            paddingBottom: CHILD_FLOW_STACK_PADDING,
          }}
        >
          {childGraphs.map((graph, index) => {
            const parentPath = path ?? '';
            const childPath = buildChildGraphPath(parentPath, index);
            const layout = childLayouts?.find(
              (item) => item.path === childPath,
            );
            const childHeight = layout?.height ?? undefined;
            const displayHeight =
              childHeight === undefined
                ? CHILD_FLOW_MAX_HEIGHT
                : Math.min(childHeight, CHILD_FLOW_MAX_HEIGHT);

            return (
              <div
                key={childPath}
                className="inner-flow"
                onClick={(event) => event.stopPropagation()}
                style={{
                  height: displayHeight,
                  minHeight: displayHeight,
                  maxHeight: CHILD_FLOW_MAX_HEIGHT,
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
      )}
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

  const flowKey = layout
    ? `${parentPath}:${layout.minX}:${layout.minY}:${layout.width}:${layout.height}`
    : parentPath;

  return (
    <ReactFlowProvider>
      <MiniReactFlowContent
        nodes={nodes}
        edges={graph.edges}
        layout={layout}
        flowKey={flowKey}
        onNodeClick={context?.onNodeClick}
        onNodesChange={handleNodesChange}
      />
    </ReactFlowProvider>
  );
};

type MiniReactFlowContentProps = {
  nodes: GraphData['nodes'];
  edges: GraphData['edges'];
  layout?: ChildGraphLayout;
  flowKey: string;
  onNodeClick?: NodeMouseHandler;
  onNodesChange?: (changes: NodeChange[]) => void;
};

const MiniReactFlowContent = ({
  nodes,
  edges,
  layout,
  flowKey,
  onNodeClick,
  onNodesChange,
}: MiniReactFlowContentProps) => {
  const reactFlow = useReactFlow();

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) {
      return;
    }
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const { x: viewportX, y: viewportY, zoom: currentZoom } =
        reactFlow.getViewport();
      const rect = element.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const flowPointerX = (pointerX - viewportX) / currentZoom;
      const flowPointerY = (pointerY - viewportY) / currentZoom;

      const delta = -event.deltaY * INNER_FLOW_ZOOM_SENSITIVITY;
      const nextZoom = Math.min(
        INNER_FLOW_MAX_ZOOM,
        Math.max(INNER_FLOW_MIN_ZOOM, currentZoom * (1 + delta)),
      );
      if (Math.abs(nextZoom - currentZoom) < 0.001) {
        return;
      }

      const nextX = pointerX - flowPointerX * nextZoom;
      const nextY = pointerY - flowPointerY * nextZoom;
      reactFlow.setViewport({ x: nextX, y: nextY, zoom: nextZoom });
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [reactFlow]);

  return (
    <div className="mini-flow-wrapper" ref={wrapperRef}>
      <ReactFlow
        key={flowKey}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        panOnDrag
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        minZoom={INNER_FLOW_MIN_ZOOM}
        maxZoom={INNER_FLOW_MAX_ZOOM}
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
    </div>
  );
};
