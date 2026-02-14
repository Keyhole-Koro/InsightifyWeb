import type { ClientView } from "@/contracts/common";

export interface StartRunRequest {
  projectId: string;
  workerId: string;
  params?: Record<string, string>;
}

export interface StartRunResponse {
  runId?: string;
  clientView?: ClientView;
}

export interface StreamRunRequest {
  workerId: string;
  params?: Record<string, string>;
}
