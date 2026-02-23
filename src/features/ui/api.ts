import { uiClient, uiWorkspaceClient } from "@/rpc/clients";
import type {
  ApplyUiOpsRequest,
  ApplyUiOpsResponse,
  CreateUiTabRequest,
  CreateUiTabResponse,
  GetUiWorkspaceRequest,
  GetUiWorkspaceResponse,
  GetUiDocumentRequest,
  GetUiDocumentResponse,
  RestoreUiRequest,
  RestoreUiResponse,
  SelectUiTabRequest,
  SelectUiTabResponse,
} from "@/contracts/ui";

export { uiClient };
export type {
  ApplyUiOpsRequest,
  ApplyUiOpsResponse,
  CreateUiTabRequest,
  CreateUiTabResponse,
  GetUiWorkspaceRequest,
  GetUiWorkspaceResponse,
  GetUiDocumentRequest,
  GetUiDocumentResponse,
  RestoreUiRequest,
  RestoreUiResponse,
  SelectUiTabRequest,
  SelectUiTabResponse,
};

type LegacyUiOp = {
  upsertNode?: { node?: unknown };
  deleteNode?: { nodeId?: string };
  clearNodes?: Record<string, never>;
};

type OneofUiOp = {
  action?:
    | { case: "upsertNode"; value: { node?: unknown } }
    | { case: "deleteNode"; value: { nodeId?: string } }
    | { case: "clearNodes"; value: Record<string, never> }
    | { case: undefined; value?: undefined };
};

const NODE_TYPE_MAP: Record<string, number> = {
  UI_NODE_TYPE_UNSPECIFIED: 0,
  UI_NODE_TYPE_LLM_CHAT: 1,
  UI_NODE_TYPE_MARKDOWN: 2,
  UI_NODE_TYPE_IMAGE: 3,
  UI_NODE_TYPE_TABLE: 4,
};

const CHAT_ROLE_MAP: Record<string, number> = {
  ROLE_UNSPECIFIED: 0,
  ROLE_USER: 1,
  ROLE_ASSISTANT: 2,
};

const toEnumNumber = (
  value: unknown,
  table: Record<string, number>,
): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    return table[value.trim()];
  }
  return undefined;
};

const normalizeUiNode = (node: unknown): unknown => {
  if (!node || typeof node !== "object") {
    return node;
  }
  const src = node as Record<string, unknown>;
  const llmChat = src.llmChat as Record<string, unknown> | undefined;
  const rawMessages = Array.isArray(llmChat?.messages) ? llmChat?.messages : [];
  const messages = rawMessages.map((m) => {
    if (!m || typeof m !== "object") {
      return m;
    }
    const mm = m as Record<string, unknown>;
    const role = toEnumNumber(mm.role, CHAT_ROLE_MAP);
    return role === undefined ? mm : { ...mm, role };
  });

  const type = toEnumNumber(src.type, NODE_TYPE_MAP);
  return {
    ...src,
    ...(type === undefined ? {} : { type }),
    ...(llmChat
      ? {
          llmChat: {
            ...llmChat,
            messages,
          },
        }
      : {}),
  };
};

const normalizeUiOp = (op: unknown): OneofUiOp => {
  const src = (op ?? {}) as LegacyUiOp & OneofUiOp;
  const action = src.action;
  if (action && typeof action === "object" && "case" in action) {
    return src;
  }
  if (src.upsertNode) {
    return {
      action: {
        case: "upsertNode",
        value: {
          ...src.upsertNode,
          node: normalizeUiNode(src.upsertNode.node),
        },
      },
    };
  }
  if (src.deleteNode) {
    return {
      action: { case: "deleteNode", value: src.deleteNode },
    };
  }
  if (src.clearNodes) {
    return {
      action: { case: "clearNodes", value: src.clearNodes },
    };
  }
  return { action: { case: undefined, value: undefined } };
};

export const getUiDocument = async (
  req: GetUiDocumentRequest,
): Promise<GetUiDocumentResponse> => {
  return await uiClient.getDocument({
    runId: req.runId,
  });
};

export const applyUiOps = async (
  req: ApplyUiOpsRequest,
): Promise<ApplyUiOpsResponse> => {
  const baseVersionRaw = req.baseVersion;
  const baseVersion =
    typeof baseVersionRaw === "number" && Number.isFinite(baseVersionRaw)
      ? Math.trunc(baseVersionRaw)
      : 0;

  return await uiClient.applyOps({
    runId: req.runId,
    baseVersion,
    ops: (req.ops ?? []).map(normalizeUiOp),
    actor: req.actor ?? "",
  });
};

export const getUiWorkspace = async (
  req: GetUiWorkspaceRequest,
): Promise<GetUiWorkspaceResponse> => {
  return await uiWorkspaceClient.getWorkspace({
    projectId: req.projectId,
  });
};

export const createUiTab = async (
  req: CreateUiTabRequest,
): Promise<CreateUiTabResponse> => {
  return await uiWorkspaceClient.createTab({
    projectId: req.projectId,
    title: req.title ?? "",
  });
};

export const selectUiTab = async (
  req: SelectUiTabRequest,
): Promise<SelectUiTabResponse> => {
  return await uiWorkspaceClient.selectTab({
    projectId: req.projectId,
    tabId: req.tabId,
  });
};

export const restoreUi = async (
  req: RestoreUiRequest,
): Promise<RestoreUiResponse> => {
  return await uiWorkspaceClient.restore({
    projectId: req.projectId,
    tabId: req.tabId ?? "",
  });
};
