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

// Service: insightify.v1.PipelineService
// Method: InitRun
export const INIT_RUN_ENDPOINT = `${base}/insightify.v1.PipelineService/InitRun`;

export async function initRun(
  request: InitRunRequest,
): Promise<InitRunResponse> {
  const res = await fetch(INIT_RUN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1",
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errorJson = await res.json();
      detail = JSON.stringify(errorJson);
    } catch {
      const text = await res.text();
      if (text) detail = text;
    }
    throw new Error(`InitRun failed (${res.status}): ${detail}`);
  }

  const resJson = await res.json();
  return resJson as InitRunResponse;
}

// Service: insightify.v1.PipelineService
// Method: StartRun
export const START_RUN_ENDPOINT = `${base}/insightify.v1.PipelineService/StartRun`;

/**
 * Starts a pipeline run using the Connect protocol.
 */
export async function startRun(
  request: StartRunRequest,
): Promise<StartRunResponse> {
  const res = await fetch(START_RUN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1",
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      // Try to parse JSON error details if available (common in Connect RPC)
      const errorJson = await res.json();
      detail = JSON.stringify(errorJson);
    } catch {
      // Fallback to text if JSON parsing fails
      const text = await res.text();
      if (text) detail = text;
    }
    throw new Error(`StartRun failed (${res.status}): ${detail}`);
  }

  const resJson = await res.json();
  console.log("startRun response:", resJson);

  return resJson as StartRunResponse;
}

export interface StreamRunRequest {
  pipelineId: string;
  params?: Record<string, string>;
}

export interface StreamRunEvent extends BaseRunEvent {}

export const STREAM_RUN_ENDPOINT = `${base}/insightify.v1.PipelineService/StreamRun`;

/**
 * Starts a streaming pipeline run.
 * Returns an async generator that yields events as they arrive.
 */
export async function* streamRun(
  request: StreamRunRequest,
  onEvent?: (event: StreamRunEvent) => void,
): AsyncGenerator<StreamRunEvent, void, unknown> {
  const res = await fetch(STREAM_RUN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1",
      "Connect-Accept-Encoding": "identity",
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`StreamRun failed (${res.status}): ${res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse newline-delimited JSON events
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line) as StreamRunEvent;
            onEvent?.(event);
            yield event;
          } catch (e) {
            console.warn("Failed to parse streaming event:", line, e);
          }
        }
      }
    }

    // Handle remaining buffer
    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer) as StreamRunEvent;
        onEvent?.(event);
        yield event;
      } catch (e) {
        console.warn("Failed to parse final event:", buffer, e);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export interface WatchRunRequest {
  runId: string;
}

export interface RunEvent extends BaseRunEvent {}

export const WATCH_RUN_ENDPOINT = `${base}/insightify.v1.PipelineService/WatchRun`;

// SSE endpoint for watching runs
export const WATCH_RUN_SSE_ENDPOINT = `${base}/api/watch`;

/**
 * Watch a running pipeline for streaming events.
 */
export async function* watchRun(
  request: WatchRunRequest,
): AsyncGenerator<RunEvent, void, unknown> {
  const url = `${WATCH_RUN_SSE_ENDPOINT}/${request.runId}`;

  const eventSource = new EventSource(url);

  const events: RunEvent[] = [];
  let resolve: (() => void) | null = null;
  let closed = false;

  eventSource.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data) as RunEvent;
      events.push(event);
      resolve?.();
    } catch (err) {
      console.warn("Failed to parse SSE event:", e.data, err);
    }
  };

  eventSource.addEventListener("close", () => {
    closed = true;
    resolve?.();
  });

  eventSource.onerror = () => {
    closed = true;
    eventSource.close();
    resolve?.();
  };

  try {
    while (!closed) {
      if (events.length > 0) {
        const event = events.shift()!;
        yield event;

        if (
          event.eventType === "EVENT_TYPE_COMPLETE" ||
          event.eventType === "EVENT_TYPE_ERROR"
        ) {
          break;
        }
      } else {
        await new Promise<void>((r) => {
          resolve = r;
        });
        resolve = null;
      }
    }
  } finally {
    eventSource.close();
  }
}
