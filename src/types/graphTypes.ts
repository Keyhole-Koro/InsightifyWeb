import { Edge, Node } from 'reactflow';

// Child graph data attached to a node
export interface NestedGraph {
  id: string;
  nodes: NestedNode[];
  edges: Edge[];
}

// Node data that can recursively reference another graph
export interface NestedNode {
  id: string;
  label: string;
  description?: string;
  position: { x: number; y: number };
  innerGraph?: NestedGraph;
}

// Custom payload stored in each React Flow node
export interface CustomNodeData {
  id: string;
  label: string;
  description?: string;
  path: string; // Hierarchical path from the root (e.g. 'root/node-1/sub-node-a')
  isExpanded: boolean;
  onExpand: () => void;
  innerGraph?: NestedGraph;
}

/**
 * Helper that turns our custom `NestedGraph` structure into React Flow-friendly
 * `Node[]` and `Edge[]` collections.
 * @param nestedGraph Graph data to convert
 * @param onExpand Callback invoked when a node toggles expansion
 * @param expandedNodes Set of node IDs that should render expanded
 * @param pathPrefix Current graph path (used to build child paths)
 * @returns React Flow nodes and edges
 */
export function transformToReactFlow(
  nestedGraph: NestedGraph,
  onExpand: (nodePath: string) => void,
  expandedNodes: Set<string>,
  pathPrefix: string = '',
): { nodes: Node<CustomNodeData>[]; edges: Edge[] } {
  const nodes: Node<CustomNodeData>[] = nestedGraph.nodes.map((node) => {
    const path = pathPrefix ? `${pathPrefix}/${node.id}` : node.id;
    return {
      id: node.id,
      type: 'custom', // Render with the custom node component
      position: node.position,
      dragHandle: '.node-header', // Only elements with this class act as drag handles
      draggable: true, // Keep nodes draggable even when panOnDrag is enabled
      data: {
        id: node.id,
        label: node.label,
        description: node.description,
        path,
        isExpanded: expandedNodes.has(path),
        onExpand: () => onExpand(path),
        innerGraph: node.innerGraph,
      },
    };
  });

  return { nodes, edges: nestedGraph.edges };
}
