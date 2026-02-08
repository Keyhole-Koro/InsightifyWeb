import type { BaseRunEvent, ClientView } from "@/types/api";

export interface StartRunRequest {
  /**
   * Session ID created by InitRun.
   */
  sessionId: string;

  /**
   * The ID of the pipeline to start.
   * Corresponds to `pipeline_id` in proto.
   */
  pipelineId: string;

  /**
   * Parameters for the pipeline run.
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
  pipelineId: string;
  params?: Record<string, string>;
}

export interface StreamRunEvent extends BaseRunEvent {}

export interface WatchRunRequest {
  runId: string;
}

export interface RunEvent extends BaseRunEvent {}

export interface SubmitRunInputRequest {
  sessionId: string;
  runId?: string;
  input: string;
}

export interface SubmitRunInputResponse {
  runId?: string;
}
