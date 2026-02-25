import {
  uiClient,
  uiWorkspaceClient,
} from "@/rpc/clients";
import type {
  ApplyUiOpsRequest,
  ApplyUiOpsResponse,
  CreateUiTabRequest,
  CreateUiTabResponse,
  CreateNodeInTabRequest,
  CreateNodeInTabResponse,
  GetUiWorkspaceRequest,
  GetUiWorkspaceResponse,
  GetUiDocumentRequest,
  GetUiDocumentResponse,
  RestoreUiRequest,
  RestoreUiResponse,
  SelectUiTabRequest,
  SelectUiTabResponse,
} from "@/contracts/ui";
import {
  UI_ACT_STATUS,
  UI_MESSAGE_ROLE,
  UI_NODE_TYPE,
  UI_RESTORE_REASON,
} from "@/contracts/ui";

export { uiClient };
export type {
  ApplyUiOpsRequest,
  ApplyUiOpsResponse,
  CreateUiTabRequest,
  CreateUiTabResponse,
  CreateNodeInTabRequest,
  CreateNodeInTabResponse,
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

const UI_NODE_TYPE_VALUES = new Set<number>(Object.values(UI_NODE_TYPE));
const UI_MESSAGE_ROLE_VALUES = new Set<number>(Object.values(UI_MESSAGE_ROLE));
const UI_ACT_STATUS_VALUES = new Set<number>(Object.values(UI_ACT_STATUS));
const UI_RESTORE_REASON_VALUES = new Set<number>(Object.values(UI_RESTORE_REASON));

const toKnownEnum = (
  value: unknown,
  allowed: Set<number>,
  fallback: number,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const v = Math.trunc(value);
  if (!allowed.has(v)) {
    return fallback;
  }
  return v;
};

const normalizeUiNodeOutgoing = (node: unknown): unknown => {
  if (!node || typeof node !== "object") {
    return node;
  }
  const src = node as Record<string, unknown>;
  const llmChat = src.llmChat as Record<string, unknown> | undefined;
  const act = src.act as Record<string, unknown> | undefined;
  const rawMessages = Array.isArray(llmChat?.messages) ? llmChat.messages : [];
  const messages = rawMessages.map((m) => {
    if (!m || typeof m !== "object") {
      return m;
    }
    const mm = m as Record<string, unknown>;
    return {
      ...mm,
      role: toKnownEnum(mm.role, UI_MESSAGE_ROLE_VALUES, UI_MESSAGE_ROLE.UNSPECIFIED),
    };
  });

  const type = toKnownEnum(src.type, UI_NODE_TYPE_VALUES, UI_NODE_TYPE.UNSPECIFIED);
  return {
    ...src,
    type,
    ...(llmChat
      ? {
          llmChat: {
            ...llmChat,
            messages,
          },
        }
      : {}),
    ...(act
      ? {
          act: {
            ...act,
            status: toKnownEnum(act.status, UI_ACT_STATUS_VALUES, UI_ACT_STATUS.UNSPECIFIED),
          },
        }
      : {}),
  };
};

const normalizeUiNodeIncoming = (node: unknown): unknown => {
  if (!node || typeof node !== "object") {
    return node;
  }
  const src = node as Record<string, unknown>;
  const llmChat = src.llmChat as Record<string, unknown> | undefined;
  const act = src.act as Record<string, unknown> | undefined;
  const rawMessages = Array.isArray(llmChat?.messages) ? llmChat.messages : [];
  const messages = rawMessages.map((m) => {
    if (!m || typeof m !== "object") {
      return m;
    }
    const mm = m as Record<string, unknown>;
    return {
      ...mm,
      role: toKnownEnum(mm.role, UI_MESSAGE_ROLE_VALUES, UI_MESSAGE_ROLE.UNSPECIFIED),
    };
  });

  return {
    ...src,
    type: toKnownEnum(src.type, UI_NODE_TYPE_VALUES, UI_NODE_TYPE.UNSPECIFIED),
    ...(llmChat
      ? {
          llmChat: {
            ...llmChat,
            messages,
          },
        }
      : {}),
    ...(act
      ? {
          act: {
            ...act,
            status: toKnownEnum(act.status, UI_ACT_STATUS_VALUES, UI_ACT_STATUS.UNSPECIFIED),
          },
        }
      : {}),
  };
};

const normalizeUiDocumentIncoming = (doc: unknown): unknown => {
  if (!doc || typeof doc !== "object") {
    return doc;
  }
  const src = doc as Record<string, unknown>;
  const nodes = Array.isArray(src.nodes)
    ? src.nodes.map((n) => normalizeUiNodeIncoming(n))
    : src.nodes;
  return {
    ...src,
    ...(nodes === undefined ? {} : { nodes }),
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
          node: normalizeUiNodeOutgoing(src.upsertNode.node),
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

const normalizeInt64 = (value: unknown): bigint => {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  return 0n;
};

const normalizeApplyUiOpsResponse = (res: unknown): ApplyUiOpsResponse => {
  const src = (res ?? {}) as Record<string, unknown>;
  return {
    ...(src as ApplyUiOpsResponse),
    document: normalizeUiDocumentIncoming(src.document) as ApplyUiOpsResponse["document"],
  };
};

const normalizeGetUiDocumentResponse = (res: unknown): GetUiDocumentResponse => {
  const src = (res ?? {}) as Record<string, unknown>;
  return {
    ...(src as GetUiDocumentResponse),
    document: normalizeUiDocumentIncoming(src.document) as GetUiDocumentResponse["document"],
  };
};

const normalizeRestoreUiResponse = (res: unknown): RestoreUiResponse => {
  const src = (res ?? {}) as Record<string, unknown>;
  return {
    ...(src as RestoreUiResponse),
    reason: toKnownEnum(src.reason, UI_RESTORE_REASON_VALUES, UI_RESTORE_REASON.UNSPECIFIED) as RestoreUiResponse["reason"],
    document: normalizeUiDocumentIncoming(src.document) as RestoreUiResponse["document"],
  };
};

const normalizeCreateNodeInTabResponse = (res: unknown): CreateNodeInTabResponse => {
  const src = (res ?? {}) as Record<string, unknown>;
  return {
    ...(src as CreateNodeInTabResponse),
    reason: toKnownEnum(src.reason, UI_RESTORE_REASON_VALUES, UI_RESTORE_REASON.UNSPECIFIED) as CreateNodeInTabResponse["reason"],
    document: normalizeUiDocumentIncoming(src.document) as CreateNodeInTabResponse["document"],
  };
};

export const getUiDocument = async (
  req: GetUiDocumentRequest,
): Promise<GetUiDocumentResponse> => {
  const res = await uiClient.getDocument({
    runId: req.runId,
  });
  return normalizeGetUiDocumentResponse(res);
};

export const applyUiOps = async (
  req: ApplyUiOpsRequest,
): Promise<ApplyUiOpsResponse> => {
  const baseVersion = normalizeInt64(req.baseVersion);

  const res = await uiClient.applyOps({
    runId: req.runId,
    baseVersion,
    ops: (req.ops ?? []).map(normalizeUiOp),
    actor: req.actor ?? "",
  });
  return normalizeApplyUiOpsResponse(res);
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
  const res = await uiWorkspaceClient.restore({
    projectId: req.projectId,
    tabId: req.tabId ?? "",
  });
  return normalizeRestoreUiResponse(res);
};

export const createNodeInTab = async (
  req: CreateNodeInTabRequest,
): Promise<CreateNodeInTabResponse> => {
  const res = await uiWorkspaceClient.createNodeInTab({
    projectId: req.projectId,
    tabId: req.tabId ?? "",
    node: normalizeUiNodeOutgoing(req.node),
    actor: req.actor,
  });
  return normalizeCreateNodeInTabResponse(res);
};
