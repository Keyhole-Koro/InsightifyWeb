import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { NodeChange, NodeMouseHandler, XYPosition } from 'reactflow';

import {
  ChildGraphLayout,
  GraphData,
  NestableNodeData,
  rootGraph,
} from '../graphData';
import {
  BASE_NODE_HEIGHT,
  CHILD_FLOW_GAP,
  CHILD_FLOW_MAX_HEIGHT,
  CHILD_FLOW_MAX_WIDTH,
  CHILD_FLOW_STACK_PADDING,
  CHILD_NODE_HEIGHT,
  CHILD_NODE_SCALE_FACTOR,
  PRIMARY_NODE_HEIGHT,
} from './constants';
import {
  GraphDimensions,
  buildChildGraphPath,
  computeGraphDimensions,
  extractChildGraphs,
  planRootNodePositions,
  resolveCollapsedSize,
} from './layout';

type GraphBuildResult = {
  nodes: GraphData['nodes'];
  dimensions: GraphDimensions;
};

type DraggingInfo = {
  display: XYPosition;
  persist: XYPosition;
};

export type NestedFlowController = {
  nodes: GraphData['nodes'];
  buildNodes: (graph: GraphData, parentPath?: string) => GraphData['nodes'];
  handleNodesChange: (changes: NodeChange[]) => void;
  handleNestedNodesChange: (
    parentPath: string,
    changes: NodeChange[],
    layout?: ChildGraphLayout,
  ) => void;
  handleAnyNodeClick: NodeMouseHandler;
};

const clonePosition = (position: XYPosition): XYPosition => ({
  x: position.x,
  y: position.y,
});

export const useNestedFlowController = (): NestedFlowController => {
  const [expandedRootIds, setExpandedRootIds] = useState<Record<string, boolean>>(
    {},
  );
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
  const [nestedPositions, setNestedPositions] = useState<
    Record<string, XYPosition>
  >({});
  const [draggingNodes, setDraggingNodes] = useState<
    Record<string, DraggingInfo>
  >({});
  const graphOffsetsRef = useRef<Record<string, XYPosition>>({
    '': { x: 0, y: 0 },
  });
  const graphScaleRef = useRef<Record<string, number>>({
    '': 1,
  });

  const handleNodeExpand = useCallback((nodeId: string) => {
    setExpandedRootIds((current) => ({
      ...current,
      [nodeId]: !current[nodeId],
    }));
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

  const updateDraggingState = useCallback(
    (
      changes: NodeChange[],
      resolveContext: (
        change: NodeChange,
      ) =>
        |
          {
            key: string;
            display?: XYPosition | null;
            persist?: XYPosition | null;
          }
        | null,
    ) => {
      if (!changes.length) {
        return;
      }

      setDraggingNodes((prev) => {
        let mutated = false;
        const next = { ...prev };

        changes.forEach((change) => {
          if (change.type !== 'position') {
            return;
          }
          const context = resolveContext(change);
          if (!context) {
            return;
          }
          const { key, display, persist } = context;

          if (change.dragging) {
            if (!display || !persist) {
              return;
            }
            const prevEntry = next[key];
            if (
              !prevEntry ||
              prevEntry.display.x !== display.x ||
              prevEntry.display.y !== display.y ||
              prevEntry.persist.x !== persist.x ||
              prevEntry.persist.y !== persist.y
            ) {
              next[key] = {
                display,
                persist,
              };
              mutated = true;
            }
            return;
          }

          if (change.dragging === false) {
            if (next[key]) {
              delete next[key];
              mutated = true;
            }
          }
        });

        return mutated ? next : prev;
      });
    },
    [],
  );

  const getGraphOffset = useCallback(
    (graphPath: string): XYPosition =>
      graphOffsetsRef.current[graphPath] ?? { x: 0, y: 0 },
    [],
  );

  const isGraphBeingDragged = useCallback(
    (graphPath: string) => {
      if (!graphPath) {
        return Object.keys(draggingNodes).some((key) => !key.includes('/'));
      }
      const prefix = `${graphPath}/`;
      return Object.keys(draggingNodes).some((key) =>
        key.startsWith(prefix),
      );
    },
    [draggingNodes],
  );

  const buildGraph = useCallback(
    (graph: GraphData, parentPath = '', scale = 1): GraphBuildResult => {
      const graphKey = parentPath || '';
      graphScaleRef.current[graphKey] = scale;
      const processedNodes = graph.nodes.map((node) => {
        const path = parentPath ? `${parentPath}/${node.id}` : node.id;
        const isRoot = parentPath === '';
        const storedPosition = isRoot
          ? rootPositions[node.id]
          : nestedPositions[path];
        const basePosition = storedPosition ?? node.position;
        const isExpanded = isRoot
          ? Boolean(expandedRootIds[node.id])
          : Boolean(nestedExpanded[path]);
        const isPrimary = isRoot
          ? node.id === primaryExpandedId
          : isExpanded;
        const depth = path ? path.split('/').length - 1 : 0;
        const zIndexBoost = isExpanded ? 100 : 0;
        const computedZIndex = 10 + depth * 10 + zIndexBoost;
        const childGraphs = extractChildGraphs(node.data.childGraph);
        const hasChildGraphs = childGraphs.length > 0;
        const collapsedSize = resolveCollapsedSize(
          node,
          isRoot,
          isPrimary,
        );
        const scaledCollapsedSize = {
          width: collapsedSize.width * scale,
          height: collapsedSize.height * scale,
        };
        let childLayouts: { layout: GraphBuildResult; path: string }[] = [];

        if (isExpanded && hasChildGraphs) {
          childLayouts = childGraphs.map((childGraph, index) => {
            const childPath = buildChildGraphPath(path, index);
            const layout = buildGraph(
              childGraph,
              childPath,
              scale * CHILD_NODE_SCALE_FACTOR,
            );
            return { layout, path: childPath };
          });
        }

        const rawWidthFromChildren = childLayouts.reduce(
          (acc, entry) => Math.max(acc, entry.layout.dimensions.width),
          0,
        );
        const widthFromChildren = Math.min(
          rawWidthFromChildren,
          CHILD_FLOW_MAX_WIDTH,
        );
        const baseHeightFromChildren = childLayouts.reduce(
          (acc, entry, index) => {
            const clampedHeight = Math.min(
              entry.layout.dimensions.height,
              CHILD_FLOW_MAX_HEIGHT,
            );
            return (
              acc + clampedHeight + (index > 0 ? CHILD_FLOW_GAP : 0)
            );
          },
          0,
        );
        const stackPadding =
          childLayouts.length > 0 ? CHILD_FLOW_STACK_PADDING * 2 : 0;
        const heightFromChildren =
          baseHeightFromChildren + stackPadding;
        const baseContentHeight =
          (node.data.size?.height ??
            (isRoot
              ? isPrimary
                ? PRIMARY_NODE_HEIGHT
                : BASE_NODE_HEIGHT
              : CHILD_NODE_HEIGHT)) * scale;
        const chromeHeight = Math.max(
          scaledCollapsedSize.height - baseContentHeight,
          0,
        );
        const adjustedHeightFromChildren =
          heightFromChildren + chromeHeight;

        const expandedWidth = childLayouts.length > 0
          ? widthFromChildren
          : scaledCollapsedSize.width;
        const expandedHeight = childLayouts.length > 0
          ? Math.max(adjustedHeightFromChildren, scaledCollapsedSize.height)
          : scaledCollapsedSize.height;

        const width = isExpanded
          ? Math.max(scaledCollapsedSize.width, expandedWidth)
          : scaledCollapsedSize.width;
        const height = isExpanded
          ? Math.max(scaledCollapsedSize.height, expandedHeight)
          : scaledCollapsedSize.height;

        const computedType =
          hasChildGraphs && node.type !== 'nestable'
            ? 'nestable'
            : node.type;

        const computedStyle: CSSProperties = {
          ...node.style,
          width,
          minHeight: height,
          height,
          zIndex: computedZIndex,
        };

        const childLayoutsMeta: ChildGraphLayout[] | undefined =
          childLayouts.length > 0
            ? childLayouts.map(({ layout, path: childPath }) => ({
                path: childPath,
                width: layout.dimensions.width,
                height: layout.dimensions.height,
                minX: layout.dimensions.minX,
                minY: layout.dimensions.minY,
              }))
            : undefined;

        return {
          ...node,
          type: computedType,
          draggable: true,
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
            childLayouts: childLayoutsMeta,
          },
          style: computedStyle,
        };
      });

      const dimensions = computeGraphDimensions(undefined, processedNodes);
      const shouldNormalize = parentPath !== '';
      const reuseOffset =
        shouldNormalize && isGraphBeingDragged(parentPath);
      const offset = reuseOffset
        ? getGraphOffset(graphKey)
        : shouldNormalize
          ? { x: dimensions.minX, y: dimensions.minY }
          : { x: 0, y: 0 };
      if (!reuseOffset) {
        graphOffsetsRef.current[graphKey] = offset;
      }
      const normalizedNodes = shouldNormalize
        ? processedNodes.map((node) => ({
            ...node,
            position: {
              x: node.position.x - offset.x,
              y: node.position.y - offset.y,
            },
          }))
        : processedNodes;

      return { nodes: normalizedNodes, dimensions };
    },
    [
      expandedRootIds,
      getGraphOffset,
      handleNodeExpand,
      isGraphBeingDragged,
      nestedExpanded,
      nestedPositions,
      primaryExpandedId,
      rootPositions,
      toggleNested,
    ],
  );

  const applyDraggingOverrides = useCallback(
    (inputNodes: GraphData['nodes']): GraphData['nodes'] =>
      inputNodes.map((node) => {
        const data = node.data as NestableNodeData | undefined;
        const path = data?.path ?? node.id;
        const override = draggingNodes[path];
        if (!override) {
          return node;
        }
        return {
          ...node,
          position: override.display,
          style: {
            ...node.style,
            opacity: 0.5,
          },
        };
      }),
    [draggingNodes],
  );

  const buildNodes = useCallback(
    (graph: GraphData, parentPath = ''): GraphData['nodes'] => {
      const graphKey = parentPath || '';
      const scale = graphScaleRef.current[graphKey] ?? 1;
      return applyDraggingOverrides(buildGraph(graph, parentPath, scale).nodes);
    },
    [applyDraggingOverrides, buildGraph],
  );

  const baseNodes = useMemo<GraphData['nodes']>(
    () => buildGraph(rootGraph).nodes,
    [buildGraph],
  );
  const nodes = useMemo<GraphData['nodes']>(
    () => applyDraggingOverrides(baseNodes),
    [applyDraggingOverrides, baseNodes],
  );
  const autoLayoutPlan = useMemo(
    () => planRootNodePositions(baseNodes),
    [baseNodes],
  );

  useEffect(() => {
    if (!autoLayoutPlan || Object.keys(draggingNodes).length > 0) {
      return;
    }
    setRootPositions((prev) => {
      let mutated = false;
      const next = { ...prev };

      Object.entries(autoLayoutPlan).forEach(([id, position]) => {
        const prevPos = prev[id];
        if (
          !prevPos ||
          prevPos.x !== position.x ||
          prevPos.y !== position.y
        ) {
          next[id] = position;
          mutated = true;
        }
      });

      return mutated ? next : prev;
    });
  }, [autoLayoutPlan, draggingNodes]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!changes.length) {
        return;
      }

      setRootPositions((prev) => {
        let mutated = false;
        const next = { ...prev };

        changes.forEach((change) => {
          if (change.type !== 'position' || change.dragging === true) {
            return;
          }
          const override = draggingNodes[change.id]?.persist;
          const finalPosition = change.position ?? override ?? null;
          if (!finalPosition) {
            return;
          }
          const prevPos = prev[change.id];
          if (
            !prevPos ||
            prevPos.x !== finalPosition.x ||
            prevPos.y !== finalPosition.y
          ) {
            next[change.id] = finalPosition;
            mutated = true;
          }
        });

        return mutated ? next : prev;
      });

      updateDraggingState(changes, (change) => {
        if (change.type !== 'position') {
          return null;
        }
        if (!change.position) {
          return { key: change.id, display: null, persist: null };
        }
        const display = clonePosition(change.position);
        return {
          key: change.id,
          display,
          persist: clonePosition(display),
        };
      });
    },
    [draggingNodes, updateDraggingState],
  );

  const handleNestedNodesChange = useCallback(
    (
      parentPath: string,
      changes: NodeChange[],
      _layout?: ChildGraphLayout,
    ) => {
      if (!parentPath) {
        return;
      }

      const graphOffset = getGraphOffset(parentPath);

      setNestedPositions((prev) => {
        let mutated = false;
        const next = { ...prev };

        changes.forEach((change) => {
          if (change.type !== 'position' || change.dragging === true) {
            return;
          }
          const key = `${parentPath}/${change.id}`;
          const override = draggingNodes[key]?.persist;
          const rawPosition = change.position
            ? {
                x: change.position.x + graphOffset.x,
                y: change.position.y + graphOffset.y,
              }
            : override ?? null;
          if (!rawPosition) {
            return;
          }
          const prevPos = prev[key];
          if (
            !prevPos ||
            prevPos.x !== rawPosition.x ||
            prevPos.y !== rawPosition.y
          ) {
            next[key] = rawPosition;
            mutated = true;
          }
        });

        return mutated ? next : prev;
      });

      updateDraggingState(changes, (change) => {
        if (change.type !== 'position') {
          return null;
        }
        const key = `${parentPath}/${change.id}`;
        if (!change.position) {
          return { key, display: null, persist: null };
        }
        const display = clonePosition(change.position);
        return {
          key,
          display,
          persist: {
            x: display.x + graphOffset.x,
            y: display.y + graphOffset.y,
          },
        };
      });
    },
    [draggingNodes, getGraphOffset, updateDraggingState],
  );

  return {
    nodes,
    buildNodes,
    handleAnyNodeClick,
    handleNestedNodesChange,
    handleNodesChange,
  };
};
