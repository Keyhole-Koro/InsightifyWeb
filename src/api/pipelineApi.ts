import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import {
  PipelineService,
  WatchRunResponse_EventType,
} from "@/gen/insightify/v1/pipeline_pb.js";
import type { EventType, BaseRunEvent, ClientView } from "@/types/api";

// Define types based on insightify/v1/pipeline.proto
export interface StartRunRequest {
  /**
   * Session ID created by InitRun.
   */
  sessionId?: string;

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
  repoUrl: string;
}

export interface InitRunResponse {
  sessionId?: string;
  repoName?: string;
}

const defaultBase =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:8080";
const base = defaultBase.replace(/\/$/, "");

const transport = createConnectTransport({
  baseUrl: base,
  useBinaryFormat: false,
});

const pipelineClient: any = createClient(PipelineService as any, transport);

const toEventType = (value: unknown): EventType => {
  if (typeof value === "string") {
    if (
      value === "EVENT_TYPE_UNSPECIFIED" ||
      value === "EVENT_TYPE_LOG" ||
      value === "EVENT_TYPE_PROGRESS" ||
      value === "EVENT_TYPE_COMPLETE" ||
      value === "EVENT_TYPE_ERROR"
    ) {
      return value;
    }
  }

  if (typeof value === "number") {
    switch (value) {
      case WatchRunResponse_EventType.EVENT_TYPE_LOG:
        return "EVENT_TYPE_LOG";
      case WatchRunResponse_EventType.EVENT_TYPE_PROGRESS:
        return "EVENT_TYPE_PROGRESS";
      case WatchRunResponse_EventType.EVENT_TYPE_COMPLETE:
        return "EVENT_TYPE_COMPLETE";
      case WatchRunResponse_EventType.EVENT_TYPE_ERROR:
        return "EVENT_TYPE_ERROR";
      default:
        return "EVENT_TYPE_UNSPECIFIED";
    }
  }

  switch (value) {
    case "LOG":
      return "EVENT_TYPE_LOG";
    case "PROGRESS":
      return "EVENT_TYPE_PROGRESS";
    case "COMPLETE":
      return "EVENT_TYPE_COMPLETE";
    case "ERROR":
      return "EVENT_TYPE_ERROR";
    default:
      return "EVENT_TYPE_UNSPECIFIED";
  }
};

export async function initRun(
  request: InitRunRequest,
): Promise<InitRunResponse> {
  const res = await pipelineClient.initRun({
    userId: request.userId,
    repoUrl: request.repoUrl,
  });
  return {
    sessionId: res.sessionId,
    repoName: res.repoName,
  };
}

/**
 * Starts a pipeline run using the Connect protocol.
 */
export async function startRun(
  request: StartRunRequest,
): Promise<StartRunResponse> {
  const res = await pipelineClient.startRun({
    sessionId: request.sessionId ?? "",
    pipelineId: request.pipelineId,
    params: request.params ?? {},
  });
  return {
    runId: res.runId,
    clientView: (res.clientView as ClientView | undefined) ?? undefined,
  };
}

export interface StreamRunRequest {
  pipelineId: string;
  params?: Record<string, string>;
}

export interface StreamRunEvent extends BaseRunEvent {}

/**
 * Legacy API kept for compatibility.
 */
export async function* streamRun(
  _request: StreamRunRequest,
  onEvent?: (event: StreamRunEvent) => void,
): AsyncGenerator<StreamRunEvent, void, unknown> {
  const event: StreamRunEvent = {
    eventType: "EVENT_TYPE_ERROR",
    message:
      "StreamRun is not available. Use startRun() + watchRun() with Connect client.",
  };
  onEvent?.(event);
  yield event;
}

export interface WatchRunRequest {
  runId: string;
}

export interface RunEvent extends BaseRunEvent {}

/**
 * Watch a running pipeline for streaming events.
 */
export async function* watchRun(
  request: WatchRunRequest,
): AsyncGenerator<RunEvent, void, unknown> {
  const stream = pipelineClient.watchRun({
    runId: request.runId,
  });

  for await (const event of stream) {
    yield {
      eventType: toEventType(event.eventType),
      message: event.message,
      progressPercent: event.progressPercent,
      clientView: (event.clientView as ClientView | undefined) ?? undefined,
    };
  }
}
