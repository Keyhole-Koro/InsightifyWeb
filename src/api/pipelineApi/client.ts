import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import {
  PipelineService,
  WatchRunResponse_EventType,
} from "@/gen/insightify/v1/pipeline_pb.js";
import type { EventType } from "@/types/api";

const defaultBase =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:8080";
const base = defaultBase.replace(/\/$/, "");

const transport = createConnectTransport({
  baseUrl: base,
  useBinaryFormat: false,
});

export const pipelineClient: any = createClient(PipelineService as any, transport);

export const toEventType = (value: unknown): EventType => {
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
