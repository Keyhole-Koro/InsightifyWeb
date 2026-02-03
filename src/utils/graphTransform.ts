import { Node, Edge } from "reactflow";
import { nodeStyles } from "@/styles/nodeStyles";

interface ApiGraphNode {
  id?: string;
  name?: string;
  label?: string;
  description?: string;
}

interface ApiGraphEdge {
  from: string;
  to: string;
}

interface ApiGraph {
  nodes?: ApiGraphNode[];
  edges?: ApiGraphEdge[];
}

export function transformApiGraphToReactFlow(
  data: ApiGraph,
  options?: { useVariedStyles?: boolean },
): { nodes: Node[]; edges: Edge[] } {
  const styles = options?.useVariedStyles ? nodeStyles : [nodeStyles[1]];

  const nodes = (data.nodes || []).map((n, i) => ({
    id: n.id || n.name || `node-${i}`,
    position: { x: (i % 3) * 300, y: Math.floor(i / 3) * 150 },
    data: { label: n.label || n.name, description: n.description },
    type: "default",
    style: {
      padding: "10px",
      width: "180px",
      textAlign: "center" as const,
      ...styles[i % styles.length],
    },
  }));

  const edges = (data.edges || []).map((e, i) => ({
    id: `e${i}`,
    source: e.from,
    target: e.to,
    animated: true,
    style: { stroke: "#555" },
  }));

  return { nodes, edges };
}
