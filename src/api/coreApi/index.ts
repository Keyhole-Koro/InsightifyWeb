import { projectClient, runClient, toEventType } from "./client";
import type {
  ChatLlmState,
  ChatMessageRole,
  ChatNode,
  ChatNodeMessage,
  ChatNodeMeta,
  ChatNodeType,
  CreateProjectRequest,
  CreateProjectResponse,
  InitRunRequest,
  InitRunResponse,
  ListProjectsRequest,
  ListProjectsResponse,
  ProjectItem,
  RunEvent,
  SelectProjectRequest,
  SelectProjectResponse,
  StartRunRequest,
  StartRunResponse,
  StreamRunEvent,
  StreamRunRequest,
  SubmitInputRequest,
  SubmitInputResponse,
  WatchRunRequest,
} from "./types";

export type {
  ChatLlmState,
  ChatMessageRole,
  ChatNode,
  ChatNodeMessage,
  ChatNodeMeta,
  ChatNodeType,
  CreateProjectRequest,
  CreateProjectResponse,
  InitRunRequest,
  InitRunResponse,
  ListProjectsRequest,
  ListProjectsResponse,
  ProjectItem,
  RunEvent,
  SelectProjectRequest,
  SelectProjectResponse,
  StartRunRequest,
  StartRunResponse,
  StreamRunEvent,
  StreamRunRequest,
  SubmitInputRequest,
  SubmitInputResponse,
  WatchRunRequest,
};

// ---------------------------------------------------------------------------
// ProjectService RPCs
// ---------------------------------------------------------------------------

export async function initRun(
  request: InitRunRequest,
): Promise<InitRunResponse> {
  const res = await projectClient.initRun({
    userId: request.userId,
    repoUrl: request.repoUrl ?? "",
    projectId: request.projectId ?? "",
  });
  return {
    projectId: res.projectId,
    repoName: res.repoName,
    bootstrapRunId: res.bootstrapRunId,
  };
}

const toProjectItem = (p: any): ProjectItem => ({
  projectId: p?.projectId ?? "",
  userId: p?.userId ?? "",
  name: p?.name ?? "Project",
  repoUrl: p?.repoUrl ?? "",
  purpose: p?.purpose ?? "",
  repoName: p?.repoName ?? "",
  isActive: Boolean(p?.isActive),
});

export async function listProjects(
  request: ListProjectsRequest,
): Promise<ListProjectsResponse> {
  const res = await projectClient.listProjects({
    userId: request.userId,
  });
  return {
    projects: (res.projects ?? []).map(toProjectItem),
    activeProjectId: res.activeProjectId,
  };
}

export async function createProject(
  request: CreateProjectRequest,
): Promise<CreateProjectResponse> {
  const res = await projectClient.createProject({
    userId: request.userId,
    name: request.name ?? "",
    repoUrl: request.repoUrl ?? "",
  });
  return {
    project: res.project ? toProjectItem(res.project) : undefined,
  };
}

export async function selectProject(
  request: SelectProjectRequest,
): Promise<SelectProjectResponse> {
  const res = await projectClient.selectProject({
    userId: request.userId,
    projectId: request.projectId,
  });
  return {
    project: res.project ? toProjectItem(res.project) : undefined,
  };
}

// ---------------------------------------------------------------------------
// RunService RPCs
// ---------------------------------------------------------------------------

export async function startRun(
  request: StartRunRequest,
): Promise<StartRunResponse> {
  const workerKey = request.workerKey.trim();
  if (!workerKey) {
    throw new Error("workerKey is required");
  }
  const projectId = request.projectId.trim();
  if (!projectId) {
    throw new Error("projectId is required");
  }
  const res = await runClient.startRun({
    projectId,
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
    "[DUMMY] streamRun() is a placeholder and is not implemented. Use startRun() + watchRun().",
};

/**
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
 * Helper to map raw node type enum to typed string.
 */
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

const mapNode = (raw: any): ChatNode | undefined => {
  if (!raw) return undefined;
  return {
    id: raw.id,
    type: mapNodeType(raw.type),
    meta: raw.meta
      ? {
        title: raw.meta.title,
        description: raw.meta.description,
        tags: raw.meta.tags,
      }
      : undefined,
    llmChat: raw.llmChat
      ? {
        model: raw.llmChat.model,
        isResponding: raw.llmChat.isResponding,
        sendLocked: raw.llmChat.sendLocked,
        sendLockHint: raw.llmChat.sendLockHint,
        messages: (raw.llmChat.messages ?? []).map((m: any) => ({
          id: m.id,
          role: mapRole(m.role),
          content: m.content,
        })),
      }
      : undefined,
    markdown: raw.markdown
      ? { markdown: raw.markdown.markdown }
      : undefined,
    image: raw.image
      ? { src: raw.image.src, alt: raw.image.alt }
      : undefined,
    table: raw.table
      ? {
        columns: raw.table.columns,
        rows: (raw.table.rows ?? []).map((r: any) => r.cells ?? []),
      }
      : undefined,
  };
};

/**
 * Watch a running worker run for streaming events.
 * Now returns inputRequestId and node fields from WatchRunResponse.
 */
export async function* watchRun(
  request: WatchRunRequest,
): AsyncGenerator<RunEvent, void, unknown> {
  const stream = runClient.watchRun({
    runId: request.runId,
  });

  for await (const event of stream) {
    yield {
      eventType: toEventType(event.eventType),
      message: event.message,
      progressPercent: event.progressPercent,
      clientView: event.clientView,
      inputRequestId: event.inputRequestId,
      node: mapNode(event.node),
    };
  }
}

/**
 * Submit user input for a pending run interaction.
 * Merges the former NeedUserInput + SendMessage RPCs.
 */
export async function submitInput(
  request: SubmitInputRequest,
): Promise<SubmitInputResponse> {
  const res = await runClient.submitInput({
    projectId: request.projectId,
    runId: request.runId,
    input: request.input,
    interactionId: request.interactionId ?? "",
    conversationId: request.conversationId ?? "",
  });
  return {
    accepted: res.accepted,
    runId: res.runId,
    interactionId: res.interactionId,
    conversationId: res.conversationId,
  };
}
