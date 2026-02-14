export interface ClientView {
  llmResponse?: string;
  graph?: ApiGraph;
}

export interface ApiGraph {
  nodes?: ApiGraphNode[];
  edges?: ApiGraphEdge[];
}

export interface ApiGraphNode {
  uid?: string;
  id?: string;
  name?: string;
  label?: string;
  description?: string;
}

export interface ApiGraphEdge {
  from: string;
  to: string;
}
