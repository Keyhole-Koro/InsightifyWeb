import { Node } from 'reactflow';
import { CustomNodeData } from '@/types/graphTypes';

const PADDING = 30; // Minimum spacing we try to retain between nodes

/**
 * Returns true when the provided rectangles overlap.
 */
function isOverlapping(rect1: DOMRect, rect2: DOMRect): boolean {
  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  );
}

/**
 * Resolve the DOMRect representing a node box (using a fallback size until measured).
 */
function getNodeRect(node: Node): DOMRect {
  const { position, width, height } = node;
  if (!width || !height) {
    // Return a placeholder size until React Flow resolves node dimensions
    return new DOMRect(position.x, position.y, 150, 50);
  }
  return new DOMRect(position.x, position.y, width, height);
}

/**
 * Resolve the final position for a dragged node by nudging it away from overlaps.
 * @param draggedNode Node being moved
 * @param nodes All sibling nodes in the same layer
 * @returns Position with overlaps resolved
 */
export function resolveNodeOverlaps(
  draggedNode: Node<CustomNodeData>,
  nodes: Node<CustomNodeData>[],
): { x: number; y: number } {
  let newPosition = { ...draggedNode.position };
  let hasOverlap = true;
  let iterations = 0;
  const MAX_ITERATIONS = 50; // Safety guard to avoid infinite loops

  while (hasOverlap && iterations < MAX_ITERATIONS) {
    hasOverlap = false;
    iterations++;

    const draggedRect = getNodeRect({ ...draggedNode, position: newPosition });

    for (const otherNode of nodes) {
      if (otherNode.id === draggedNode.id) continue;

      const otherRect = getNodeRect(otherNode);

      if (isOverlapping(draggedRect, otherRect)) {
        hasOverlap = true;

        // Move the node a bit toward the direction that clears the overlap
        const dx = (draggedRect.left + draggedRect.width / 2) - (otherRect.left + otherRect.width / 2);
        const dy = (draggedRect.top + draggedRect.height / 2) - (otherRect.top + otherRect.height / 2);

        const overlapX = (draggedRect.width + otherRect.width) / 2 - Math.abs(dx);
        const overlapY = (draggedRect.height + otherRect.height) / 2 - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            newPosition.x += (dx > 0 ? 1 : -1) * (overlapX + PADDING);
          } else {
            newPosition.y += (dy > 0 ? 1 : -1) * (overlapY + PADDING);
          }
        }
        // Fix one overlap per iteration and re-check all nodes
        break;
      }
    }
  }

  return newPosition;
}

export function resolveGraphOverlaps(
  nodes: Node<CustomNodeData>[],
  shouldLockNode?: (node: Node<CustomNodeData>) => boolean,
): Node<CustomNodeData>[] {
  const nextNodes = nodes.map((node) => ({ ...node }));

  nextNodes.forEach((node, index) => {
    if (shouldLockNode?.(node)) {
      return;
    }
    const resolvedPosition = resolveNodeOverlaps(node, nextNodes);
    if (
      resolvedPosition.x !== node.position.x ||
      resolvedPosition.y !== node.position.y
    ) {
      nextNodes[index] = {
        ...node,
        position: resolvedPosition,
      };
    }
  });

  return nextNodes;
}
