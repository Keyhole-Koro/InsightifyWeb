import { pipelineClient, toEventType } from "./client";
import type {
  InitRunRequest,
  InitRunResponse,
  RunEvent,
  SubmitRunInputRequest,
  SubmitRunInputResponse,
  StartRunRequest,
  StartRunResponse,
  StreamRunEvent,
  StreamRunRequest,
  WatchRunRequest,
} from "./types";

export type {
  InitRunRequest,
  InitRunResponse,
  RunEvent,
  SubmitRunInputRequest,
  SubmitRunInputResponse,
  StartRunRequest,
  StartRunResponse,
  StreamRunEvent,
  StreamRunRequest,
  WatchRunRequest,
};

export async function initRun(
  request: InitRunRequest,
): Promise<InitRunResponse> {
  const res = await pipelineClient.initRun({
    userId: request.userId,
    repoUrl: request.repoUrl ?? "",
  });
  return {
    sessionId: res.sessionId,
    repoName: res.repoName,
    bootstrapRunId: res.bootstrapRunId,
  };
}

/**
 * Starts a pipeline run using the Connect protocol.
 */
export async function startRun(
  request: StartRunRequest,
): Promise<StartRunResponse> {
  const res = await pipelineClient.startRun({
    sessionId: request.sessionId,
    pipelineId: request.pipelineId,
    params: request.params ?? {},
  });
  return {
    runId: res.runId,
    clientView: res.clientView,
  };
}

const STREAM_RUN_DUMMY_EVENT: StreamRunEvent = {
  eventType: "EVENT_TYPE_ERROR",
  message:
    "[DUMMY] streamRun() is a placeholder and is not implemented. Use startRun() + watchRun() with Connect client.",
};

/**
 * DUMMY IMPLEMENTATION: kept only for backward compatibility.
 *
 * This function intentionally does not stream.
 */
export async function* streamRun(
  _request: StreamRunRequest,
  onEvent?: (event: StreamRunEvent) => void,
): AsyncGenerator<StreamRunEvent, void, unknown> {
  onEvent?.(STREAM_RUN_DUMMY_EVENT);
  yield STREAM_RUN_DUMMY_EVENT;
}

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
      clientView: event.clientView,
    };
  }
}

export async function submitRunInput(
  request: SubmitRunInputRequest,
): Promise<SubmitRunInputResponse> {
  const res = await pipelineClient.submitRunInput({
    sessionId: request.sessionId,
    runId: request.runId ?? "",
    input: request.input,
  });
  return { runId: res.runId };
}
