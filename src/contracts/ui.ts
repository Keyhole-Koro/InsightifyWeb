export const UI_NODE_TYPE = {
  UNSPECIFIED: 0,
  LLM_CHAT: 1,
  MARKDOWN: 2,
  IMAGE: 3,
  TABLE: 4,
  ACT: 5,
} as const;
export type UiNodeType = (typeof UI_NODE_TYPE)[keyof typeof UI_NODE_TYPE];

export interface UiNodeMeta {
  title?: string;
  description?: string;
  tags?: string[];
}

export const UI_MESSAGE_ROLE = {
  UNSPECIFIED: 0,
  USER: 1,
  ASSISTANT: 2,
} as const;
export type UiMessageRole =
  (typeof UI_MESSAGE_ROLE)[keyof typeof UI_MESSAGE_ROLE];

export interface UiChatMessage {
  id?: string;
  role?: UiMessageRole;
  content?: string;
}

export interface UiLlmState {
  model?: string;
  isResponding?: boolean;
  sendLocked?: boolean;
  sendLockHint?: string;
  messages?: UiChatMessage[];
}

export interface UiMarkdownState {
  markdown?: string;
}

export interface UiImageState {
  src?: string;
  alt?: string;
}

export interface UiTableState {
  columns?: string[];
  rows?: string[][];
}

export const UI_ACT_STATUS = {
  UNSPECIFIED: 0,
  IDLE: 1,
  PLANNING: 2,
  SUGGESTING: 3,
  SEARCHING: 4,
  RUNNING_WORKER: 5,
  NEEDS_USER_ACTION: 6,
  DONE: 7,
  FAILED: 8,
} as const;
export type UiActStatus = (typeof UI_ACT_STATUS)[keyof typeof UI_ACT_STATUS];

export interface UiActPendingAction {
  id?: string;
  label?: string;
  description?: string;
}

export interface UiActTimelineEvent {
  id?: string;
  createdAtUnixMs?: number;
  kind?: string;
  summary?: string;
  detail?: string;
  workerKey?: string;
}

export interface UiActState {
  actId?: string;
  status?: UiActStatus;
  mode?: string;
  goal?: string;
  selectedWorker?: string;
  pendingActions?: UiActPendingAction[];
  timeline?: UiActTimelineEvent[];
}

export interface UiNode {
  id?: string;
  type?: UiNodeType;
  meta?: UiNodeMeta;
  llmChat?: UiLlmState;
  markdown?: UiMarkdownState;
  image?: UiImageState;
  table?: UiTableState;
  act?: UiActState;
}

export type ChatNode = UiNode;

export interface UiDocument {
  runId?: string;
  version?: number;
  nodes?: UiNode[];
}

export interface GetUiDocumentRequest {
  runId: string;
}

export interface GetUiDocumentResponse {
  document?: UiDocument;
}

export interface UiWorkspace {
  workspaceId?: string;
  projectId?: string;
  name?: string;
  activeTabId?: string;
}

export interface UiWorkspaceTab {
  tabId?: string;
  workspaceId?: string;
  title?: string;
  runId?: string;
  orderIndex?: number;
  isPinned?: boolean;
  createdAtUnixMs?: number;
}

export interface GetUiWorkspaceRequest {
  projectId: string;
}

export interface GetUiWorkspaceResponse {
  workspace?: UiWorkspace;
  tabs?: UiWorkspaceTab[];
}

export interface CreateUiTabRequest {
  projectId: string;
  title?: string;
}

export interface CreateUiTabResponse {
  workspace?: UiWorkspace;
  tab?: UiWorkspaceTab;
  tabs?: UiWorkspaceTab[];
}

export interface SelectUiTabRequest {
  projectId: string;
  tabId: string;
}

export interface SelectUiTabResponse {
  workspace?: UiWorkspace;
  tabs?: UiWorkspaceTab[];
}

export const UI_RESTORE_REASON = {
  UNSPECIFIED: 0,
  RESOLVED: 1,
  NO_TAB: 2,
  NO_RUN: 3,
  ERROR: 4,
} as const;
export type UiRestoreReason =
  (typeof UI_RESTORE_REASON)[keyof typeof UI_RESTORE_REASON];

export interface RestoreUiRequest {
  projectId: string;
  tabId?: string;
}

export interface RestoreUiResponse {
  reason?: UiRestoreReason;
  projectId?: string;
  tabId?: string;
  runId?: string;
  document?: UiDocument;
  documentHash?: string;
}

export interface CreateNodeInTabRequest {
  projectId: string;
  tabId?: string;
  node: UiNode;
  actor: string;
}

export interface CreateNodeInTabResponse {
  reason?: UiRestoreReason;
  projectId?: string;
  tabId?: string;
  runId?: string;
  nodeId?: string;
  document?: UiDocument;
  documentHash?: string;
}

export interface UiOpUpsertNode {
  upsertNode: {
    node: UiNode;
  };
}

export interface UiOpDeleteNode {
  deleteNode: {
    nodeId: string;
  };
}

export interface UiOpClearNodes {
  clearNodes: Record<string, never>;
}

export type UiOp = UiOpUpsertNode | UiOpDeleteNode | UiOpClearNodes;

export interface ApplyUiOpsRequest {
  runId: string;
  baseVersion?: number;
  ops: UiOp[];
  actor?: string;
}

export interface ApplyUiOpsResponse {
  document?: UiDocument;
  conflict?: boolean;
  currentVersion?: number;
  conflictMessage?: string;
}
