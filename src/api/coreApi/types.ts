import type { BaseRunEvent, ClientView } from "@/types/api";

export interface StartRunRequest {
  /**
   * Session ID created by InitRun.
   */
  sessionId: string;

  /**
   * The worker key to start.
   * Mapped to `pipeline_id` in proto for backward compatibility.
   */
  workerKey: string;

  /**
   * @deprecated Use workerKey.
   */
  pipelineId?: string;

  /**
   * Parameters for the worker run.
   * Corresponds to `params` map<string, string> in proto.
   */
  params?: Record<string, string>;
}

export interface StartRunResponse {
  runId?: string;
  clientView?: ClientView;
}

export interface InitRunRequest {
  userId: string;
  repoUrl?: string;
}

export interface InitRunResponse {
  sessionId?: string;
  repoName?: string;
  bootstrapRunId?: string;
}

export interface StreamRunRequest {
  workerKey: string;
  /**
   * @deprecated Use workerKey.
   */
  pipelineId?: string;
  params?: Record<string, string>;
}

export interface StreamRunEvent extends BaseRunEvent {}

export interface WatchRunRequest {
  runId: string;
}

export interface RunEvent extends BaseRunEvent {}

export interface NeedUserInputRequest {
  sessionId: string;
  runId?: string;
  input: string;
}

export interface NeedUserInputResponse {
  runId?: string;
}
