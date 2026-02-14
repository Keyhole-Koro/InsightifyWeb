import type { BaseRunEvent, ClientView } from "@/shared/types/api";

export interface StartRunRequest {
  projectId: string;
  workerKey: string;
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

export interface StreamRunEvent extends BaseRunEvent { }

export interface WatchRunRequest {
  runId: string;
}

export interface RunEvent extends BaseRunEvent { }

export interface WaitForInputRequest {
  projectId: string;
  runId: string;
  conversationId?: string;
  timeoutMs?: number;
}

export interface WaitForInputResponse {
  waiting?: boolean;
  interactionId?: string;
  closed?: boolean;
}

export interface SendMessageRequest {
  projectId: string;
  runId: string;
  input: string;
  interactionId?: string;
  conversationId?: string;
}

export interface SendMessageResponse {
  accepted?: boolean;
  interactionId?: string;
  conversationId?: string;
}

export interface CloseInteractionRequest {
  projectId: string;
  runId: string;
  interactionId?: string;
  conversationId?: string;
  reason?: string;
}

export interface CloseInteractionResponse {
  closed?: boolean;
}

// ---------------------------------------------------------------------------
// UI node types (from ui.proto — UI types only)
// ---------------------------------------------------------------------------

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
