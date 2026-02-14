export type UiNodeType =
  | "UI_NODE_TYPE_UNSPECIFIED"
  | "UI_NODE_TYPE_LLM_CHAT"
  | "UI_NODE_TYPE_MARKDOWN"
  | "UI_NODE_TYPE_IMAGE"
  | "UI_NODE_TYPE_TABLE";

export interface UiNodeMeta {
  title?: string;
  description?: string;
  tags?: string[];
}

export type UiMessageRole =
  | "ROLE_UNSPECIFIED"
  | "ROLE_USER"
  | "ROLE_ASSISTANT";

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

export interface UiNode {
  id?: string;
  type?: UiNodeType;
  meta?: UiNodeMeta;
  llmChat?: UiLlmState;
  markdown?: UiMarkdownState;
  image?: UiImageState;
  table?: UiTableState;
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

