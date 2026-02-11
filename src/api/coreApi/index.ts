import { llmChatClient, pipelineClient, toChatEventType, toEventType } from "./client";
import type {
  ChatEvent,
  ChatLlmState,
  ChatMessageRole,
  ChatNode,
  ChatNodeMessage,
  ChatNodeMeta,
  ChatNodeType,
  InitRunRequest,
  InitRunResponse,
  NeedUserInputRequest,
  NeedUserInputResponse,
  RunEvent,
  SendChatMessageRequest,
  SendChatMessageResponse,
  StartRunRequest,
  StartRunResponse,
  StreamRunEvent,
  StreamRunRequest,
  WatchChatRequest,
  WatchRunRequest,
} from "./types";

export type {
  ChatEvent,
  ChatLlmState,
  ChatMessageRole,
  ChatNode,
  ChatNodeMessage,
  ChatNodeMeta,
  ChatNodeType,
  InitRunRequest,
  InitRunResponse,
  NeedUserInputRequest,
  NeedUserInputResponse,
  RunEvent,
  SendChatMessageRequest,
  SendChatMessageResponse,
  StartRunRequest,
  StartRunResponse,
  StreamRunEvent,
  StreamRunRequest,
  WatchChatRequest,
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
 * Starts a worker run using the Connect protocol.
 */
export async function startRun(
  request: StartRunRequest,
): Promise<StartRunResponse> {
  const workerKey = (request.workerKey ?? request.pipelineId ?? "").trim();
  if (!workerKey) {
    throw new Error("workerKey is required");
  }
  const res = await pipelineClient.startRun({
    sessionId: request.sessionId,
    pipelineId: workerKey,
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
 * Watch a running worker run for streaming events.
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

export async function respondNeedUserInput(
  request: NeedUserInputRequest,
): Promise<NeedUserInputResponse> {
  const res = await sendChatMessage({
    sessionId: request.sessionId,
    runId: request.runId ?? "",
    interactionId: request.interactionId ?? "",
    input: request.input,
  });
  return {
    runId: request.runId,
    accepted: res.accepted,
    interactionId: res.interactionId,
  };
}

export async function* watchChat(
  request: WatchChatRequest,
): AsyncGenerator<ChatEvent, void, unknown> {
  const stream = llmChatClient.watchChat({
    sessionId: request.sessionId ?? "",
    runId: request.runId,
  });
  for await (const event of stream) {
    const mapNodeType = (value: unknown): ChatNodeType => {
      if (typeof value === "string") return value as ChatNodeType;
      switch (value) {
        case 1:
          return "UI_NODE_TYPE_LLM_CHAT";
        case 2:
          return "UI_NODE_TYPE_MARKDOWN";
        case 3:
          return "UI_NODE_TYPE_IMAGE";
        case 4:
          return "UI_NODE_TYPE_TABLE";
        default:
          return "UI_NODE_TYPE_UNSPECIFIED";
      }
    };
    const mapRole = (value: unknown): ChatMessageRole => {
      if (typeof value === "string") return value as ChatMessageRole;
      switch (value) {
        case 1:
          return "ROLE_USER";
        case 2:
          return "ROLE_ASSISTANT";
        default:
          return "ROLE_UNSPECIFIED";
      }
    };

    yield {
      eventType: toChatEventType(event.eventType),
      sessionId: event.sessionId,
      runId: event.runId,
      workerKey: event.workerKey,
      interactionId: event.interactionId,
      seq: event.seq,
      text: event.text,
      node: event.node
        ? {
            id: event.node.id,
            type: mapNodeType(event.node.type),
            meta: event.node.meta
              ? {
                  title: event.node.meta.title,
                  description: event.node.meta.description,
                  tags: event.node.meta.tags,
                }
              : undefined,
            llmChat: event.node.llmChat
              ? {
                  model: event.node.llmChat.model,
                  isResponding: event.node.llmChat.isResponding,
                  sendLocked: event.node.llmChat.sendLocked,
                  sendLockHint: event.node.llmChat.sendLockHint,
                  messages: (event.node.llmChat.messages ?? []).map((m: any) => ({
                    id: m.id,
                    role: mapRole(m.role),
                    content: m.content,
                  })),
                }
              : undefined,
            markdown: event.node.markdown
              ? {
                  markdown: event.node.markdown.markdown,
                }
              : undefined,
            image: event.node.image
              ? {
                  src: event.node.image.src,
                  alt: event.node.image.alt,
                }
              : undefined,
            table: event.node.table
              ? {
                  columns: event.node.table.columns,
                  rows: (event.node.table.rows ?? []).map((r: any) => r.cells ?? []),
                }
              : undefined,
          }
        : undefined,
    };
  }
}

export async function sendChatMessage(
  request: SendChatMessageRequest,
): Promise<SendChatMessageResponse> {
  const res = await llmChatClient.sendMessage({
    sessionId: request.sessionId,
    runId: request.runId,
    interactionId: request.interactionId ?? "",
    input: request.input,
    clientMsgId: request.clientMsgId ?? "",
  });
  return {
    accepted: res.accepted,
    interactionId: res.interactionId,
  };
}
