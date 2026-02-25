export interface WaitRequest {
  runId: string;
  nodeId: string;
  timeoutMs?: number;
}

export interface WaitResponse {
  waiting?: boolean;
  interactionId?: string;
  closed?: boolean;
}

export interface SendRequest {
  runId: string;
  nodeId: string;
  input: string;
  interactionId?: string;
}

export interface SendResponse {
  accepted?: boolean;
  interactionId?: string;
  assistantMessage?: string;
}

export interface CloseRequest {
  runId: string;
  nodeId: string;
  interactionId?: string;
  reason?: string;
}

export interface CloseResponse {
  closed?: boolean;
}
