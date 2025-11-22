import {
  CSSProperties,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  NodeMouseHandler,
  NodeChange,
  NodeProps,
  Position,
  ReactFlowProvider,
  XYPosition,
} from 'reactflow';

import { GraphData, NestableNodeData, rootGraph } from './graphData';

const BASE_NODE_WIDTH = 200;
const BASE_NODE_HEIGHT = 180;
const PRIMARY_NODE_WIDTH = 260;
const PRIMARY_NODE_HEIGHT = 240;
const CHILD_NODE_WIDTH = 140;
const CHILD_NODE_HEIGHT = 100;
const CHILD_PADDING = 80;

const computeGraphDimensions = (
  graph?: GraphData,
  nodesOverride?: GraphData['nodes'],
) => {
  const nodes = nodesOverride ?? graph?.nodes;

  if (!nodes || nodes.length === 0) {
    return { width: BASE_NODE_WIDTH, height: BASE_NODE_HEIGHT };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const { x, y } = node.position;
    const nodeWidth =
      typeof node.style?.width === 'number'
        ? (node.style.width as number)
        : CHILD_NODE_WIDTH;
    const nodeHeight =
      typeof node.style?.height === 'number'
        ? (node.style.height as number)
        : CHILD_NODE_HEIGHT;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + nodeWidth);
    maxY = Math.max(maxY, y + nodeHeight);
  });

  const width = Math.max(maxX - minX + CHILD_PADDING, BASE_NODE_WIDTH);
  const height = Math.max(maxY - minY + CHILD_PADDING, BASE_NODE_HEIGHT);

  return { width, height };
};

type NestedGraphContextValue = {
  buildNodes: (graph: GraphData, parentPath: string) => GraphData['nodes'];
  onNodeClick: NodeMouseHandler;
};

const NestedGraphContext = createContext<NestedGraphContextValue | null>(null);

const NestableNode = ({
  data,
  style,
}: NodeProps<NestableNodeData> & { style?: CSSProperties }) => {
  const { label, onExpand, isExpanded, isPrimaryExpanded, childGraph, path } =
    data;
  const resolvedExpanded = Boolean(isExpanded);
  const resolvedPrimary = Boolean(isPrimaryExpanded);

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
      {resolvedExpanded && childGraph && (
        <div className="inner-flow" onClick={(event) => event.stopPropagation()}>
          <MiniReactFlow graph={childGraph} parentPath={path ?? ''} />
        </div>
      )}
    </div>
  );
};

const nodeTypes = { nestable: NestableNode };

const MiniReactFlow = ({
  graph,
  parentPath,
}: {
  graph: GraphData;
  parentPath: string;
}) => {
  const context = useContext(NestedGraphContext);
  const buildFromContext = context?.buildNodes;
  const nodes = useMemo(() => {
    const baseNodes = buildFromContext
      ? buildFromContext(graph, parentPath)
      : graph.nodes;

    return baseNodes.map((node) => {
      if (node.data.childGraph && node.type !== 'nestable') {
        return { ...node, type: 'nestable' };
      }
      return node;
    });
  }, [buildFromContext, graph, parentPath]);

  return (
    <ReactFlowProvider>
      <ReactFlow
        fitView
        nodes={nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        onNodeClick={context?.onNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
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

const NestedFlow = () => {
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [primaryExpandedId, setPrimaryExpandedId] = useState<string | null>(null);
  const [nestedExpanded, setNestedExpanded] = useState<Record<string, boolean>>(
    {},
  );
  const [rootPositions, setRootPositions] = useState<Record<string, XYPosition>>(
    () =>
      rootGraph.nodes.reduce<Record<string, XYPosition>>((acc, node) => {
        acc[node.id] = node.position;
        return acc;
      }, {}),
  );

  const handleNodeExpand = useCallback((nodeId: string) => {
    setExpandedNodeId((current) => (current === nodeId ? null : nodeId));
    setPrimaryExpandedId((current) => current ?? nodeId);
  }, []);

  const toggleNested = useCallback((path: string) => {
    setNestedExpanded((current) => ({
      ...current,
      [path]: !current[path],
    }));
  }, []);

  const handleAnyNodeClick = useCallback<NodeMouseHandler>(
    (_, node) => {
      const data = node.data as NestableNodeData | undefined;
      if (!data) {
        return;
      }

      const identifier = data.path ?? data.label ?? node.id;
      console.log('[NestedFlow] clicked node:', identifier);
      data.onExpand?.();
    },
    [],
  );

  const buildNodes = useCallback(
    (graph: GraphData, parentPath = ''): GraphData['nodes'] => {
      return graph.nodes.map((node) => {
        const path = parentPath ? `${parentPath}/${node.id}` : node.id;
        const isRoot = parentPath === '';
        const basePosition = isRoot
          ? rootPositions[node.id] ?? node.position
          : node.position;
        const isExpanded = isRoot
          ? node.id === expandedNodeId
          : Boolean(nestedExpanded[path]);
        const isPrimary = isRoot
          ? node.id === primaryExpandedId
          : isExpanded;
        const shouldBuildChildren = Boolean(
          node.data.childGraph && isExpanded,
        );
        const childNodes =
          shouldBuildChildren && node.data.childGraph
            ? buildNodes(node.data.childGraph, path)
            : null;
        const computedType =
          node.data.childGraph && node.type !== 'nestable'
            ? 'nestable'
            : node.type;
        const childDimensions =
          isExpanded && childNodes
            ? computeGraphDimensions(undefined, childNodes)
            : computeGraphDimensions(node.data.childGraph);
        const collapsedWidth = isRoot
          ? isPrimary
            ? PRIMARY_NODE_WIDTH
            : BASE_NODE_WIDTH
          : typeof node.style?.width === 'number'
            ? (node.style.width as number)
            : BASE_NODE_WIDTH;
        const collapsedHeight = isRoot
          ? isPrimary
            ? PRIMARY_NODE_HEIGHT
            : BASE_NODE_HEIGHT
          : typeof node.style?.height === 'number'
            ? (node.style.height as number)
            : BASE_NODE_HEIGHT;
        const width = isExpanded
          ? Math.max(collapsedWidth, childDimensions.width)
          : collapsedWidth;
        const height = isExpanded
          ? childDimensions.height
          : collapsedHeight;

        const computedStyle: CSSProperties = {
          ...node.style,
          width,
          minHeight: height,
          height,
        };

        return {
          ...node,
          type: computedType,
          draggable: isRoot,
          dragHandle: isRoot ? '.node-handle' : node.dragHandle,
          position: basePosition,
          data: {
            ...node.data,
            onExpand: isRoot
              ? () => handleNodeExpand(node.id)
              : () => toggleNested(path),
            isExpanded,
            isPrimaryExpanded: isPrimary,
            path,
          },
          style: computedStyle,
        };
      });
    },
    [
      expandedNodeId,
      handleNodeExpand,
      nestedExpanded,
      primaryExpandedId,
      rootPositions,
      toggleNested,
    ],
  );

  const nodes = useMemo<GraphData['nodes']>(
    () => buildNodes(rootGraph),
    [buildNodes],
  );

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setRootPositions((prev) => {
      let mutated = false;
      const next = { ...prev };

      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          const prevPos = prev[change.id];
          if (
            !prevPos ||
            prevPos.x !== change.position.x ||
            prevPos.y !== change.position.y
          ) {
            next[change.id] = change.position;
            mutated = true;
          }
        }
      });

      return mutated ? next : prev;
    });
  }, []);

  return (
    <NestedGraphContext.Provider
      value={{ buildNodes, onNodeClick: handleAnyNodeClick }}
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
