// Common event type used across pipeline APIs
export type EventType =
  | "EVENT_TYPE_UNSPECIFIED"
  | "EVENT_TYPE_LOG"
  | "EVENT_TYPE_PROGRESS"
  | "EVENT_TYPE_COMPLETE"
  | "EVENT_TYPE_ERROR";

export type ChatEventType =
  | "EVENT_TYPE_UNSPECIFIED"
  | "EVENT_TYPE_ASSISTANT_CHUNK"
  | "EVENT_TYPE_ASSISTANT_FINAL"
  | "EVENT_TYPE_NEED_INPUT"
  | "EVENT_TYPE_COMPLETE"
  | "EVENT_TYPE_ERROR";

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
}
