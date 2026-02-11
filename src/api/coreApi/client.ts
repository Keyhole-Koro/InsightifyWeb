import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import {
  PipelineService,
  WatchRunResponse_EventType,
} from "@/gen/insightify/v1/pipeline_pb.js";
import {
  ChatEvent_EventType,
  LlmChatService,
} from "@/gen/insightify/v1/llm_chat_pb.js";
import type { ChatEventType, EventType } from "@/types/api";

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

export const pipelineClient: any = createClient(PipelineService as any, transport);
export const llmChatClient: any = createClient(LlmChatService as any, transport);

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

export const toChatEventType = (value: unknown): ChatEventType => {
  if (typeof value === "string") {
    if (
      value === "EVENT_TYPE_UNSPECIFIED" ||
      value === "EVENT_TYPE_ASSISTANT_CHUNK" ||
      value === "EVENT_TYPE_ASSISTANT_FINAL" ||
      value === "EVENT_TYPE_NEED_INPUT" ||
      value === "EVENT_TYPE_ERROR" ||
      value === "EVENT_TYPE_COMPLETE"
    ) {
      return value;
    }
  }

  if (typeof value === "number") {
    switch (value) {
      case ChatEvent_EventType.ASSISTANT_CHUNK:
      case (ChatEvent_EventType as any).EVENT_TYPE_ASSISTANT_CHUNK:
        return "EVENT_TYPE_ASSISTANT_CHUNK";
      case ChatEvent_EventType.ASSISTANT_FINAL:
      case (ChatEvent_EventType as any).EVENT_TYPE_ASSISTANT_FINAL:
        return "EVENT_TYPE_ASSISTANT_FINAL";
      case ChatEvent_EventType.NEED_INPUT:
      case (ChatEvent_EventType as any).EVENT_TYPE_NEED_INPUT:
        return "EVENT_TYPE_NEED_INPUT";
      case ChatEvent_EventType.ERROR:
      case (ChatEvent_EventType as any).EVENT_TYPE_ERROR:
        return "EVENT_TYPE_ERROR";
      case ChatEvent_EventType.COMPLETE:
      case (ChatEvent_EventType as any).EVENT_TYPE_COMPLETE:
        return "EVENT_TYPE_COMPLETE";
      default:
        return "EVENT_TYPE_UNSPECIFIED";
    }
  }

  if (typeof value === "string") {
    switch (value) {
      case "UNSPECIFIED":
        return "EVENT_TYPE_UNSPECIFIED";
      case "ASSISTANT_CHUNK":
        return "EVENT_TYPE_ASSISTANT_CHUNK";
      case "ASSISTANT_FINAL":
        return "EVENT_TYPE_ASSISTANT_FINAL";
      case "NEED_INPUT":
        return "EVENT_TYPE_NEED_INPUT";
      case "ERROR":
        return "EVENT_TYPE_ERROR";
      case "COMPLETE":
        return "EVENT_TYPE_COMPLETE";
      default:
        return "EVENT_TYPE_UNSPECIFIED";
    }
  }

  return "EVENT_TYPE_UNSPECIFIED";
};
