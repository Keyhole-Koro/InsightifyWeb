// Common event type used across pipeline APIs
export type EventType =
  | "EVENT_TYPE_UNSPECIFIED"
  | "EVENT_TYPE_LOG"
  | "EVENT_TYPE_PROGRESS"
  | "EVENT_TYPE_COMPLETE"
  | "EVENT_TYPE_ERROR";

export interface ClientView {
  graph?: ApiGraph;
}

export interface ApiGraph {
  nodes?: ApiGraphNode[];
  edges?: ApiGraphEdge[];
}

export interface ApiGraphNode {
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
}
