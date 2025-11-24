import { useState, useCallback, useMemo, useEffect, WheelEvent, MouseEvent as ReactMouseEvent } from 'react';
import ReactFlow, {
  Controls,
  Background,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow,
  NodeDragHandler,
  useNodesState,
  useEdgesState,
  NodeChange
} from 'reactflow';

import {
  NestedGraph,
  CustomNodeData,
  transformToReactFlow,
} from '@/types/graphTypes';
import { CustomNode } from '@/components/CustomNode/CustomNode';
import { useAutoLayout } from '@/hooks/useAutoLayout';

interface NestedGraphEditorProps {
  initialGraph: NestedGraph;
  parentPath?: string;
}

function GraphView({ initialGraph, parentPath = '' }: NestedGraphEditorProps) {
  const [activeNodePath, setActiveNodePath] = useState<string | null>(null);
  const { getViewport, setViewport } = useReactFlow<CustomNodeData>();
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<CustomNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { resolveAllOverlaps, runOverlapRemoval } = useAutoLayout();
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const noPanClassName = useMemo(() => {
    const normalizedPath = parentPath.replace(/[^a-zA-Z0-9-]/g, '-') || 'root';
    return `nopan-${normalizedPath}`;
  }, [parentPath]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Log position changes for debugging
    for (const change of changes) {
      if (change.type === 'dimensions') {
        setLayoutTick(t => t + 1);
      }
    }
    onNodesChangeInternal(changes);
  }, [onNodesChangeInternal]);

  const [layoutTick, setLayoutTick] = useState(0);
  const handleNodeExpandToggle = useCallback((nodePath: string) => {
    setActiveNodePath(nodePath);
    setNodes((currentNodes) => {
      const expandedNodePaths = new Set<string>();
      const newNodes = currentNodes.map(n => {
        if (n.data.path === nodePath) {
          const isExpanded = !n.data.isExpanded;
          if (isExpanded) {
            expandedNodePaths.add(nodePath);
          }
          return { ...n, data: { ...n.data, isExpanded } };
        }
        if (n.data.isExpanded) {
          expandedNodePaths.add(n.data.path);
        }
        return n;
      });

      const { nodes: transformedNodes, edges: transformedEdges } = transformToReactFlow(
        initialGraph,
        handleNodeExpandToggle,
        expandedNodePaths,
        parentPath,
      );
      setEdges(transformedEdges);
      return transformedNodes;
    });
    setLayoutTick(t => t + 1);
  }, [initialGraph, parentPath, setNodes, setEdges]);

  const lockPriorityNodes = useCallback(
    (node: Node<CustomNodeData>) => {
      const nodePath = (node.data as CustomNodeData | undefined)?.path ?? node.id;
      return Boolean(node.data?.isExpanded) || nodePath === activeNodePath;
    },
    [activeNodePath],
  );

  useEffect(() => {
    // Seed nodes/edges on initial render
    const { nodes: initialNodes, edges: initialEdges } = transformToReactFlow(
      initialGraph,
      handleNodeExpandToggle,
      new Set(),
      parentPath,
    );
    setNodes(initialNodes);
    setEdges(initialEdges);
    setLayoutTick(t => t + 1);
  }, [initialGraph, parentPath, setNodes, setEdges, handleNodeExpandToggle]);

  // Re-run overlap resolution after nodes finish rendering with new sizes
  useEffect(() => {
    if (layoutTick === 0) {
      return;
    }
    // Wait for the next frame so DOM measurements are up to date
    const frame = requestAnimationFrame(() => {
      resolveAllOverlaps(lockPriorityNodes);
    });
    return () => cancelAnimationFrame(frame);
    // Only run once per layout tick to avoid thrashing
  }, [layoutTick, lockPriorityNodes, resolveAllOverlaps]);

  const onNodeDrag: NodeDragHandler = useCallback(
    (_event, node) => {
      runOverlapRemoval(node);
    },
    [runOverlapRemoval],
  );

  const onNodeDragStop: NodeDragHandler = useCallback(
    (_event, node) => {
      const nodePath = (node.data as CustomNodeData | undefined)?.path ?? node.id;
      setActiveNodePath(nodePath);
      // Drag-based layout (`runLayout`) is not currently implemented in useAutoLayout.
    },
    [],
  );

  const onWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const { x, y, zoom } = getViewport();

      if (event.ctrlKey) {
        // Zoom
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        setViewport({ x, y, zoom: zoom * zoomFactor }, { duration: 80 });
      } else {
        // Pan
        setViewport({ x: x - event.deltaX, y: y - event.deltaY, zoom }, { duration: 80 });
      }
    },
    [getViewport, setViewport],
  );

  const onNodeClick = useCallback((_event: ReactMouseEvent, node: Node) => {
    console.log('Node clicked:', node);
  }, []);

  const onEdgeClick = useCallback((_event: ReactMouseEvent, edge: Edge) => {
    console.log('Edge clicked:', edge);
  }, []);

  const onPaneClick = useCallback((event: ReactMouseEvent) => {
    // Stop propagation to prevent clicks on the pane from being caught by parent flows.
    event.stopPropagation();
    console.log('Pane clicked:', event);
    setActiveNodePath(null);
  }, []);

  return (
    <ReactFlow
      nodes={nodes as Node[]}
      edges={edges as Edge[]}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      fitView
      onWheel={onWheel}
      panOnDrag
      noPanClassName={noPanClassName}
      zoomOnScroll={false} // Disable default zoom so Ctrl+Scroll handler can take over
      zoomOnPinch
      zoomOnDoubleClick
    >
      <Controls />
      <Background />
    </ReactFlow>
  );
}

export function NestedGraphEditor(props: NestedGraphEditorProps) {
  return (
    <ReactFlowProvider>
      <GraphView {...props} />
    </ReactFlowProvider>
  );
}
