import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import {
  ProjectService,
} from "@/gen/insightify/v1/project_pb.js";
import {
  RunService,
  WatchRunResponse_EventType,
} from "@/gen/insightify/v1/run_pb.js";
import type { EventType } from "@/types/api";

const defaultBase =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:8080";
const base = defaultBase.replace(/\/$/, "");

const transport = createConnectTransport({
  baseUrl: base,
  useBinaryFormat: false,
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
});

export const projectClient: any = createClient(ProjectService as any, transport);
export const runClient: any = createClient(RunService as any, transport);

export const toEventType = (value: unknown): EventType => {
  if (typeof value === "string") {
    if (
      value === "EVENT_TYPE_UNSPECIFIED" ||
      value === "EVENT_TYPE_LOG" ||
      value === "EVENT_TYPE_PROGRESS" ||
      value === "EVENT_TYPE_COMPLETE" ||
      value === "EVENT_TYPE_ERROR" ||
      value === "EVENT_TYPE_INPUT_REQUIRED" ||
      value === "EVENT_TYPE_NODE_READY"
    ) {
      return value;
    }
  }

  if (typeof value === "number") {
    switch (value) {
      case WatchRunResponse_EventType.LOG:
      case (WatchRunResponse_EventType as any).EVENT_TYPE_LOG:
        return "EVENT_TYPE_LOG";
      case WatchRunResponse_EventType.PROGRESS:
      case (WatchRunResponse_EventType as any).EVENT_TYPE_PROGRESS:
        return "EVENT_TYPE_PROGRESS";
      case WatchRunResponse_EventType.COMPLETE:
      case (WatchRunResponse_EventType as any).EVENT_TYPE_COMPLETE:
        return "EVENT_TYPE_COMPLETE";
      case WatchRunResponse_EventType.ERROR:
      case (WatchRunResponse_EventType as any).EVENT_TYPE_ERROR:
        return "EVENT_TYPE_ERROR";
      case WatchRunResponse_EventType.INPUT_REQUIRED:
      case (WatchRunResponse_EventType as any).EVENT_TYPE_INPUT_REQUIRED:
        return "EVENT_TYPE_INPUT_REQUIRED";
      case WatchRunResponse_EventType.NODE_READY:
      case (WatchRunResponse_EventType as any).EVENT_TYPE_NODE_READY:
        return "EVENT_TYPE_NODE_READY";
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
    case "INPUT_REQUIRED":
      return "EVENT_TYPE_INPUT_REQUIRED";
    case "NODE_READY":
      return "EVENT_TYPE_NODE_READY";
    default:
      return "EVENT_TYPE_UNSPECIFIED";
  }
};
