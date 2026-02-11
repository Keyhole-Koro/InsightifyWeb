import type { BaseRunEvent, ClientView } from "@/types/api";

export interface StartRunRequest {
  /**
   * Project ID created by CreateProject / InitRun.
   */
  projectId: string;

  /**
   * The worker key to start.
   */
  workerKey: string;

  /**
   * Parameters for the worker run.
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
  repoUrl?: string;
  projectId?: string;
}

export interface InitRunResponse {
  projectId?: string;
  repoName?: string;
  bootstrapRunId?: string;
}

export interface ProjectItem {
  projectId: string;
  userId: string;
  name: string;
  repoUrl?: string;
  purpose?: string;
  repoName?: string;
  isActive?: boolean;
}

export interface ListProjectsRequest {
  userId: string;
}

export interface ListProjectsResponse {
  projects: ProjectItem[];
  activeProjectId?: string;
}

export interface CreateProjectRequest {
  userId: string;
  name?: string;
  repoUrl?: string;
}

export interface CreateProjectResponse {
  project?: ProjectItem;
}

export interface SelectProjectRequest {
  userId: string;
  projectId: string;
}

export interface SelectProjectResponse {
  project?: ProjectItem;
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

export interface NeedUserInputRequest {
  projectId: string;
  runId?: string;
  interactionId?: string;
  input: string;
}

export interface NeedUserInputResponse {
  runId?: string;
  accepted?: boolean;
  interactionId?: string;
}

export interface WatchChatRequest {
  projectId: string;
  runId?: string;
  conversationId?: string;
  fromSeq?: number;
}

export interface ChatEvent {
  eventType:
    | "EVENT_TYPE_UNSPECIFIED"
    | "EVENT_TYPE_ASSISTANT_CHUNK"
    | "EVENT_TYPE_ASSISTANT_FINAL"
    | "EVENT_TYPE_NEED_INPUT"
    | "EVENT_TYPE_COMPLETE"
    | "EVENT_TYPE_ERROR";
  projectId?: string;
  runId?: string;
  conversationId?: string;
  workerKey?: string;
  interactionId?: string;
  seq?: number;
  text?: string;
  node?: ChatNode;
}

export type ChatNodeType =
  | "UI_NODE_TYPE_UNSPECIFIED"
  | "UI_NODE_TYPE_LLM_CHAT"
  | "UI_NODE_TYPE_MARKDOWN"
  | "UI_NODE_TYPE_IMAGE"
  | "UI_NODE_TYPE_TABLE";

export interface ChatNodeMeta {
  title?: string;
  description?: string;
  tags?: string[];
}

export type ChatMessageRole =
  | "ROLE_UNSPECIFIED"
  | "ROLE_USER"
  | "ROLE_ASSISTANT";

export interface ChatNodeMessage {
  id?: string;
  role?: ChatMessageRole;
  content?: string;
}

export interface ChatLlmState {
  model?: string;
  isResponding?: boolean;
  sendLocked?: boolean;
  sendLockHint?: string;
  messages?: ChatNodeMessage[];
}

export interface ChatMarkdownState {
  markdown?: string;
}

export interface ChatImageState {
  src?: string;
  alt?: string;
}

export interface ChatTableState {
  columns?: string[];
  rows?: string[][];
}

export interface ChatNode {
  id?: string;
  type?: ChatNodeType;
  meta?: ChatNodeMeta;
  llmChat?: ChatLlmState;
  markdown?: ChatMarkdownState;
  image?: ChatImageState;
  table?: ChatTableState;
}

export interface SendChatMessageRequest {
  projectId: string;
  runId: string;
  conversationId?: string;
  interactionId?: string;
  input: string;
  clientMsgId?: string;
}

export interface SendChatMessageResponse {
  accepted?: boolean;
  interactionId?: string;
  conversationId?: string;
}
