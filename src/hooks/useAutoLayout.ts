import { useCallback, useRef } from 'react';
import { Node, useReactFlow, NodeChange } from 'reactflow';
import { CustomNodeData } from '@/types/graphTypes';

export const useAutoLayout = () => {
  const { getNodes, setNodes, getEdges } = useReactFlow<CustomNodeData>();
  const animationFrameRef = useRef<number | null>(null);

  const resolveAllOverlaps = useCallback((isLocked: (node: Node) => boolean) => {
    const nodes = getNodes();
    const simulationNodes = nodes.map(node => ({ ...node }));

    // A simple iterative overlap removal
    const iterations = 100;
    const padding = 20;

    for (let i = 0; i < iterations; i++) {
      for (let j = 0; j < simulationNodes.length; j++) {
        for (let k = j + 1; k < simulationNodes.length; k++) {
          const nodeA = simulationNodes[j];
          const nodeB = simulationNodes[k];

          const dx = nodeB.position.x - nodeA.position.x;
          const dy = nodeB.position.y - nodeA.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const minDistance = (nodeA.width ?? 0) + (nodeB.width ?? 0) + padding;

          if (distance < minDistance) {
            const angle = Math.atan2(dy, dx);
            const overlap = minDistance - distance;
            const moveX = (overlap / 2) * Math.cos(angle);
            const moveY = (overlap / 2) * Math.sin(angle);

            if (!isLocked(nodeA)) {
              nodeA.position.x -= moveX;
              nodeA.position.y -= moveY;
            }
            if (!isLocked(nodeB)) {
              nodeB.position.x += moveX;
              nodeB.position.y += moveY;
            }
          }
        }
      }
    }
    console.log('[useAutoLayout] Resolving overlaps. New positions calculated.');
    setNodes(simulationNodes);
  }, [getNodes, setNodes]);

  const runOverlapRemoval = useCallback((draggedNode: Node) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const nodes = getNodes();
      const padding = 30;

      const updatedNodes = nodes.map(node => {
        if (node.id === draggedNode.id) {
          return node; // The dragged node's position is handled by React Flow
        }

        const nodeA = draggedNode;
        const nodeB = node;

        const nodeAWidth = nodeA.width ?? 150;
        const nodeAHeight = nodeA.height ?? 50;
        const nodeBWidth = nodeB.width ?? 150;
        const nodeBHeight = nodeB.height ?? 50;

        const overlapX = Math.max(0, Math.min(nodeA.position.x + nodeAWidth, nodeB.position.x + nodeBWidth) - Math.max(nodeA.position.x, nodeB.position.x) + padding);
        const overlapY = Math.max(0, Math.min(nodeA.position.y + nodeAHeight, nodeB.position.y + nodeBHeight) - Math.max(nodeA.position.y, nodeB.position.y) + padding);

        if (overlapX > 0 && overlapY > 0) {
          let moveX = 0;
          let moveY = 0;

          if (overlapX < overlapY) {
            moveX = nodeA.position.x < nodeB.position.x ? overlapX : -overlapX;
          } else {
            moveY = nodeA.position.y < nodeB.position.y ? overlapY : -overlapY;
          }

          const newPosition = {
            x: nodeB.position.x + moveX,
            y: nodeB.position.y + moveY,
          };

          console.log(`[useAutoLayout] Moving node ${node.id} away from ${draggedNode.id}. New position:`, newPosition);
          return { ...nodeB, position: newPosition };
        }

        return node;
      });

      setNodes(updatedNodes);
    });
  }, [getNodes, setNodes]);

  return {
    resolveAllOverlaps,
    runOverlapRemoval,
  };
};