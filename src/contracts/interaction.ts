export interface WaitRequest {
  runId: string;
  timeoutMs?: number;
}

export interface WaitResponse {
  waiting?: boolean;
  interactionId?: string;
  closed?: boolean;
}

export interface SendRequest {
  runId: string;
  input: string;
  interactionId?: string;
}

export interface SendResponse {
  accepted?: boolean;
  interactionId?: string;
}

export interface CloseRequest {
  runId: string;
  interactionId?: string;
  reason?: string;
}

export interface CloseResponse {
  closed?: boolean;
}

