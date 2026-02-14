// Common event type used across run APIs.
export type EventType =
  | "EVENT_TYPE_UNSPECIFIED"
  | "EVENT_TYPE_LOG"
  | "EVENT_TYPE_PROGRESS"
  | "EVENT_TYPE_COMPLETE"
  | "EVENT_TYPE_ERROR"
  | "EVENT_TYPE_NODE_READY";

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

export interface BaseRunEvent {
  eventType: EventType;
  message?: string;
  progressPercent?: number;
  clientView?: ClientView;
  node?: import("@/shared/types/core").ChatNode;
}
