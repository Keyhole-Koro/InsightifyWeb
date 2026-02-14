import type { BaseRunEvent, ClientView } from "@/contracts/common";

export interface StartRunRequest {
  projectId: string;
  workerKey: string;
  params?: Record<string, string>;
}

export interface StartRunResponse {
  runId?: string;
  clientView?: ClientView;
}

export interface StreamRunRequest {
  workerKey: string;
  params?: Record<string, string>;
}

export interface StreamRunEvent extends BaseRunEvent {}

export interface WatchRunRequest {
  runId: string;
}

export interface RunEvent extends BaseRunEvent {}

