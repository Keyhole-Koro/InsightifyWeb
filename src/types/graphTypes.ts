import type { ComponentType } from "react";
import { Edge, Node, Position, type NodeProps } from "reactflow";

// Child graph data attached to a node
export interface Graph {
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
  data?: {
    style?: Record<string, string | number>;
  };
  innerGraph?: Graph;
  handles?: NodeHandleConfig[];
}

export interface NodeHandleConfig {
  id: string;
  type: "source" | "target";
  position?: Position;
  style?: Record<string, string | number>;
  label?: string;
}

// Custom payload stored in each React Flow node
export interface CustomNodeData {
  id: string;
  label: string;
  description?: string;
  path: string; // Hierarchical path from the root (e.g. 'root/node-1/sub-node-a')
  isExpanded: boolean;
  onExpand: () => void;
  innerGraph?: Graph;
  handles?: NodeHandleConfig[];
}

export interface LLMInputNodeData {
  type: "llmChat";
  props: LLMChatNodeProps;
  meta?: GraphNodeMeta;
}

export type GraphNodeType = "llmChat" | "markdown" | "image" | "table";

export interface GraphNodeMeta {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface GraphNodeShell<TType extends GraphNodeType, TProps> {
  type: TType;
  props: TProps;
  meta?: GraphNodeMeta;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface LLMChatNodeProps {
  model?: string;
  input: string;
  isResponding: boolean;
  messages: ChatMessage[];
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export interface MarkdownNodeProps {
  markdown: string;
}

export interface ImageNodeProps {
  src: string;
  alt?: string;
}

export interface TableNodeProps {
  columns: string[];
  rows: string[][];
}

export interface GraphNodePropsByType {
  llmChat: LLMChatNodeProps;
  markdown: MarkdownNodeProps;
  image: ImageNodeProps;
  table: TableNodeProps;
}

export type GraphNodeData<TType extends GraphNodeType = GraphNodeType> =
  GraphNodeShell<TType, GraphNodePropsByType[TType]>;

export type RuntimeGraphNode<TType extends GraphNodeType = GraphNodeType> =
  Node<GraphNodeData<TType>, TType>;

export type GraphNodeComponent<TType extends GraphNodeType = GraphNodeType> =
  ComponentType<NodeProps<GraphNodeData<TType>>>;

export type GraphNodeRegistry = {
  [K in GraphNodeType]?: GraphNodeComponent<K>;
};

/**
 * Helper that turns our custom `Graph` structure into React Flow-friendly
 * `Node[]` and `Edge[]` collections.
 * @param Graph Graph data to convert
 * @param onExpand Callback invoked when a node toggles expansion
 * @param expandedNodes Set of node IDs that should render expanded
 * @param pathPrefix Current graph path (used to build child paths)
 * @returns React Flow nodes and edges
 */
export function transformToReactFlow(
  Graph: Graph,
  onExpand: (nodePath: string) => void,
  expandedNodes: Set<string>,
  pathPrefix: string = "",
): { nodes: Node<CustomNodeData>[]; edges: Edge[] } {
  const nodes: Node<CustomNodeData>[] = Graph.nodes.map((node) => {
    const path = pathPrefix ? `${pathPrefix}/${node.id}` : node.id;
    return {
      id: node.id,
      type: "custom", // Render with the custom node component
      position: node.position,
      dragHandle: ".node-header", // Only elements with this class act as drag handles
      draggable: true, // Keep nodes draggable even when panOnDrag is enabled
      data: {
        id: node.id,
        label: node.label,
        description: node.description,
        path,
        isExpanded: expandedNodes.has(path),
        onExpand: () => onExpand(path),
        innerGraph: node.innerGraph,
        handles: node.handles,
      },
    };
  });

  return { nodes, edges: Graph.edges };
}
