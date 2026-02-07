import { Node, Edge } from "reactflow";
import { nodeStyles } from "@/styles/nodeStyles";
import type { ApiGraph } from "@/types/api";

export function transformApiGraphToReactFlow(
  data: ApiGraph,
  options?: { useVariedStyles?: boolean },
): { nodes: Node[]; edges: Edge[] } {
  const styles = options?.useVariedStyles ? nodeStyles : [nodeStyles[1]];

  const nodes = (data.nodes || []).map((n, i) => ({
    id: n.uid || n.id || n.name || `node-${i}`,
    position: { x: (i % 3) * 300, y: Math.floor(i / 3) * 150 },
    data: { label: n.label || n.name || n.uid, description: n.description },
    type: "default",
    style: {
      padding: "10px",
      width: "180px",
      textAlign: "center" as const,
      ...styles[i % styles.length],
    },
  }));

  const edges = (data.edges || []).map((e, i) => ({
    // Keep edge IDs stable across streamed snapshots to avoid accidental overwrite.
    id: `${e.from}->${e.to}#${i}`,
    source: e.from,
    target: e.to,
    animated: true,
    style: { stroke: "#555" },
  }));

  return { nodes, edges };
}
