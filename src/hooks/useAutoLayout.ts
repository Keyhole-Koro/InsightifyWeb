import { useCallback, useRef } from "react";
import { Node, useReactFlow } from "reactflow";
import { CustomNodeData } from "@/types/graphTypes";
import { resolveGraphOverlaps } from "@/layout/layout";
import ELK from "elkjs/lib/elk.bundled.js";

export const useAutoLayout = () => {
  const { getNodes, setNodes, getEdges } = useReactFlow<CustomNodeData>();
  const animationFrameRef = useRef<number | null>(null);
  type ElkInstance = InstanceType<typeof ELK>;
  const elkRef = useRef<ElkInstance | null>(null);

  if (!elkRef.current) {
    elkRef.current = new ELK();
  }

  const resolveAllOverlaps = useCallback(
    (isLocked: (node: Node) => boolean) => {
      const nodes = getNodes() as Node<CustomNodeData>[];
      const resolved = resolveGraphOverlaps(nodes, (node) => isLocked(node));
      setNodes(resolved);
    },
    [getNodes, setNodes],
  );

  const runOverlapRemoval = useCallback(
    (draggedNode: Node) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const nodes = getNodes() as Node<CustomNodeData>[];
        const updatedNodes = resolveGraphOverlaps(
          nodes,
          (node) => node.id === draggedNode.id,
        );
        setNodes(updatedNodes);
      });
    },
    [getNodes, setNodes],
  );

  type SugiyamaLayoutOptions = {
    direction?: "RIGHT" | "LEFT" | "DOWN" | "UP";
    layerSpacing?: number;
    nodeSpacing?: number;
  };

  const runSugiyamaLayout = useCallback(
    async (options: SugiyamaLayoutOptions = {}) => {
      const nodes = getNodes();
      const edges = getEdges();

      if (nodes.length === 0) return;

      const direction = options.direction ?? "RIGHT";
      const layerSpacing = options.layerSpacing ?? 80;
      const nodeSpacing = options.nodeSpacing ?? 50;

      const elkGraph = {
        id: "root",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": direction,
          "elk.layered.spacing.nodeNodeBetweenLayers": String(layerSpacing),
          "elk.spacing.nodeNode": String(nodeSpacing),
        },
        children: nodes.map((node) => ({
          id: node.id,
          width: node.width ?? 180,
          height: node.height ?? 60,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      };

      try {
        const layout = await elkRef.current!.layout(elkGraph);
        const layoutChildren = layout.children ?? [];

        const laidOutNodes = nodes.map((node) => {
          const layoutNode = layoutChildren.find((n) => n.id === node.id);
          if (!layoutNode || layoutNode.x == null || layoutNode.y == null) {
            return node;
          }
          return {
            ...node,
            position: {
              x: layoutNode.x,
              y: layoutNode.y,
            },
          };
        });

        setNodes(laidOutNodes);
      } catch (err) {
        console.warn("ELK layout failed, falling back to overlap resolver.", err);
        resolveAllOverlaps(() => false);
      }
    },
    [getEdges, getNodes, resolveAllOverlaps, setNodes],
  );

  return {
    runLayout: runSugiyamaLayout,
    runSugiyamaLayout,
    resolveAllOverlaps,
    runOverlapRemoval,
  };
};
