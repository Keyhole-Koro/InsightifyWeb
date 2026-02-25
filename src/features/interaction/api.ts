import { apiBaseUrl } from "@/shared/env";
import {
  getCurrentTraceScopeId,
  getLastTraceId,
  newTraceId,
  setLastTraceId,
} from "@/shared/trace";
import {
  type CloseRequest,
  type CloseResponse,
  type SendRequest,
  type SendResponse,
  type WaitRequest,
  type WaitResponse,
} from "@/contracts/interaction";

export type { CloseRequest, CloseResponse, SendRequest, SendResponse, WaitRequest, WaitResponse };

type WSInbound =
  | {
      type: "wait_state";
      runId?: string;
      nodeId?: string;
      traceId?: string;
      interactionId?: string;
      waiting?: boolean;
      closed?: boolean;
    }
  | {
      type: "assistant_message";
      runId?: string;
      nodeId?: string;
      traceId?: string;
      interactionId?: string;
      assistantMessage?: string;
    }
  | {
      type: "send_ack";
      runId?: string;
      nodeId?: string;
      traceId?: string;
      interactionId?: string;
      accepted?: boolean;
      assistantMessage?: string;
    }
  | {
      type: "close_ack";
      runId?: string;
      nodeId?: string;
      traceId?: string;
      closed?: boolean;
    }
  | {
      type: "subscribed";
      runId?: string;
      nodeId?: string;
      traceId?: string;
    }
  | {
      type: "error";
      code?: string;
      message?: string;
      traceId?: string;
    }
  | {
      type: "pong";
      traceId?: string;
    };

type Waiter = {
  resolve: (res: WaitResponse) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
};

type Resolver<T> = {
  resolve: (value: T) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type RunSocket = {
  key: string;
  runId: string;
  nodeId: string;
  traceId: string;
  ws: WebSocket;
  openPromise: Promise<void>;
  waiters: Waiter[];
  sendQueue: Resolver<SendResponse>[];
  closeQueue: Resolver<CloseResponse>[];
  lastState: WaitResponse | null;
  onAssistantMessage: Set<(msg: { interactionId: string; assistantMessage: string }) => void>;
  assistantBacklog: Array<{ interactionId: string; assistantMessage: string }>;
};

const runSockets = new Map<string, RunSocket>();
const interactionWSDebug = import.meta.env.DEV;

function wsBaseURL(): string {
  const base = (apiBaseUrl || window.location.origin).replace(/\/$/, "");
  if (base.startsWith("https://")) {
    return "wss://" + base.slice("https://".length);
  }
  if (base.startsWith("http://")) {
    return "ws://" + base.slice("http://".length);
  }
  return base.replace(/^http/, "ws");
}

function socketKey(runId: string, nodeId: string): string {
  return `${runId}::${nodeId}`;
}

function wsURLForNode(runId: string, nodeId: string, traceId: string): string {
  const base = wsBaseURL();
  return `${base}/ws/interaction?run_id=${encodeURIComponent(runId)}&node_id=${encodeURIComponent(nodeId)}&trace_id=${encodeURIComponent(traceId)}`;
}

function withTraceId(message: string, traceId: string): string {
  const tid = (traceId ?? "").trim();
  if (!tid) {
    return message;
  }
  return `${message} (Trace ID: ${tid})`;
}

function newTimeoutError(message: string, traceId: string): Error {
  return new Error(withTraceId(message, traceId));
}

function resolveWaitersWithState(sock: RunSocket, state: WaitResponse): void {
  sock.lastState = state;
  if (!state.waiting && !state.closed) {
    return;
  }
  const pending = sock.waiters.splice(0, sock.waiters.length);
  for (const waiter of pending) {
    if (waiter.timer) {
      clearTimeout(waiter.timer);
    }
    waiter.resolve(state);
  }
}

function rejectAllPending(sock: RunSocket, err: Error): void {
  const waiters = sock.waiters.splice(0, sock.waiters.length);
  for (const waiter of waiters) {
    if (waiter.timer) {
      clearTimeout(waiter.timer);
    }
    waiter.reject(err);
  }
  const sendQueue = sock.sendQueue.splice(0, sock.sendQueue.length);
  for (const p of sendQueue) {
    clearTimeout(p.timer);
    p.reject(err);
  }
  const closeQueue = sock.closeQueue.splice(0, sock.closeQueue.length);
  for (const p of closeQueue) {
    clearTimeout(p.timer);
    p.reject(err);
  }
}

function maybeUpdateTraceId(sock: RunSocket, traceId?: string): void {
  const tid = (traceId ?? "").trim();
  if (!tid) {
    return;
  }
  sock.traceId = tid;
  setLastTraceId(tid);
}

function handleWSMessage(sock: RunSocket, raw: MessageEvent<string>): void {
  if (interactionWSDebug) {
    console.log("[interaction-ws] raw message", {
      runId: sock.runId,
      nodeId: sock.nodeId,
      raw: raw.data,
    });
  }

  let msg: WSInbound;
  try {
    msg = JSON.parse(raw.data) as WSInbound;
  } catch {
    if (interactionWSDebug) {
      console.warn("[interaction-ws] failed to parse message", {
        runId: sock.runId,
        nodeId: sock.nodeId,
        raw: raw.data,
      });
    }
    return;
  }

  maybeUpdateTraceId(sock, msg.traceId);

  switch (msg.type) {
    case "wait_state": {
      resolveWaitersWithState(sock, {
        waiting: Boolean(msg.waiting),
        interactionId: (msg.interactionId ?? "").trim(),
        closed: Boolean(msg.closed),
      });
      return;
    }
    case "assistant_message": {
      const interactionId = (msg.interactionId ?? "").trim();
      const assistantMessage = (msg.assistantMessage ?? "").trim();
      if (!assistantMessage) {
        return;
      }
      if (interactionWSDebug) {
        console.log("[interaction-ws] assistant_message received", {
          runId: sock.runId,
          nodeId: sock.nodeId,
          traceId: sock.traceId,
          interactionId,
          assistantMessage,
        });
      }
      const payload = { interactionId, assistantMessage };
      if (sock.onAssistantMessage.size === 0) {
        sock.assistantBacklog.push(payload);
        if (sock.assistantBacklog.length > 32) {
          sock.assistantBacklog.shift();
        }
        return;
      }
      for (const cb of sock.onAssistantMessage) {
        cb(payload);
      }
      return;
    }
    case "send_ack": {
      const pending = sock.sendQueue.shift();
      if (!pending) {
        return;
      }
      clearTimeout(pending.timer);
      pending.resolve({
        accepted: Boolean(msg.accepted),
        interactionId: (msg.interactionId ?? "").trim(),
        assistantMessage: (msg.assistantMessage ?? "").trim(),
      });
      return;
    }
    case "close_ack": {
      const pending = sock.closeQueue.shift();
      if (!pending) {
        return;
      }
      clearTimeout(pending.timer);
      pending.resolve({
        closed: Boolean(msg.closed),
      });
      return;
    }
    case "error": {
      const err = new Error(withTraceId((msg.message ?? "interaction websocket error").trim(), sock.traceId));
      rejectAllPending(sock, err);
      return;
    }
    case "subscribed":
    case "pong":
      return;
  }
}

function ensureRunSocket(runId: string, nodeId: string): RunSocket {
  const rid = (runId ?? "").trim();
  const nid = (nodeId ?? "").trim();
  if (!rid || !nid) {
    throw new Error("runId and nodeId are required");
  }
  const key = socketKey(rid, nid);

  const existing = runSockets.get(key);
  if (existing && (existing.ws.readyState === WebSocket.OPEN || existing.ws.readyState === WebSocket.CONNECTING)) {
    return existing;
  }

  const traceId = getCurrentTraceScopeId() || getLastTraceId() || newTraceId();
  setLastTraceId(traceId);

  const ws = new WebSocket(wsURLForNode(rid, nid, traceId));
  const sock: RunSocket = {
    key,
    runId: rid,
    nodeId: nid,
    traceId,
    ws,
    openPromise: Promise.resolve(),
    waiters: [],
    sendQueue: [],
    closeQueue: [],
    lastState: null,
    onAssistantMessage: new Set(),
    assistantBacklog: [],
  };

  sock.openPromise = new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error(withTraceId("interaction websocket open failed", sock.traceId)));
  });

  ws.onmessage = (ev) => handleWSMessage(sock, ev as MessageEvent<string>);
  ws.onclose = () => {
    runSockets.delete(key);
    rejectAllPending(sock, new Error(withTraceId("interaction websocket closed", sock.traceId)));
  };
  ws.onerror = () => {
    // noop: onclose handles cleanup/reject.
  };

  runSockets.set(key, sock);
  return sock;
}

function sendWSMessage(sock: RunSocket, payload: Record<string, unknown>): void {
  if (sock.ws.readyState !== WebSocket.OPEN) {
    throw new Error(withTraceId("interaction websocket is not open", sock.traceId));
  }
  sock.ws.send(JSON.stringify(payload));
}

export const wait = async (req: WaitRequest): Promise<WaitResponse> => {
  const runId = (req.runId ?? "").trim();
  const nodeId = (req.nodeId ?? "").trim();
  if (!runId || !nodeId) {
    throw new Error("runId and nodeId are required");
  }
  const timeoutMs = Math.max(0, Number(req.timeoutMs ?? 0));

  const sock = ensureRunSocket(runId, nodeId);
  await sock.openPromise;

  const current = sock.lastState;
  if (current && (current.waiting || current.closed)) {
    return current;
  }
  if (timeoutMs <= 0) {
    return current ?? { waiting: false, interactionId: "", closed: false };
  }

  return await new Promise<WaitResponse>((resolve, reject) => {
    const waiter: Waiter = {
      resolve: (res) => resolve(res),
      reject: (err) => reject(err),
      timer: null,
    };
    waiter.timer = setTimeout(() => {
      const i = sock.waiters.indexOf(waiter);
      if (i >= 0) {
        sock.waiters.splice(i, 1);
      }
      resolve({
        waiting: false,
        interactionId: (sock.lastState?.interactionId ?? "").trim(),
        closed: false,
      });
    }, timeoutMs);
    sock.waiters.push(waiter);
  });
};

export const send = async (req: SendRequest): Promise<SendResponse> => {
  const runId = (req.runId ?? "").trim();
  const nodeId = (req.nodeId ?? "").trim();
  const input = (req.input ?? "").trim();
  if (!runId || !nodeId) {
    throw new Error("runId and nodeId are required");
  }
  if (!input) {
    throw new Error("input is required");
  }

  const sock = ensureRunSocket(runId, nodeId);
  await sock.openPromise;

  return await new Promise<SendResponse>((resolve, reject) => {
    const pending: Resolver<SendResponse> = {
      resolve,
      reject,
      timer: setTimeout(() => {
        const i = sock.sendQueue.indexOf(pending);
        if (i >= 0) {
          sock.sendQueue.splice(i, 1);
        }
        reject(newTimeoutError("send timeout", sock.traceId));
      }, 15_000),
    };
    sock.sendQueue.push(pending);

    try {
      sendWSMessage(sock, {
        type: "send",
        runId,
        nodeId,
        interactionId: (req.interactionId ?? "").trim(),
        input,
      });
    } catch (err) {
      clearTimeout(pending.timer);
      const i = sock.sendQueue.indexOf(pending);
      if (i >= 0) {
        sock.sendQueue.splice(i, 1);
      }
      reject(err instanceof Error ? err : new Error(withTraceId(String(err), sock.traceId)));
    }
  });
};

export const close = async (req: CloseRequest): Promise<CloseResponse> => {
  const runId = (req.runId ?? "").trim();
  const nodeId = (req.nodeId ?? "").trim();
  if (!runId || !nodeId) {
    throw new Error("runId and nodeId are required");
  }

  const sock = ensureRunSocket(runId, nodeId);
  await sock.openPromise;

  return await new Promise<CloseResponse>((resolve, reject) => {
    const pending: Resolver<CloseResponse> = {
      resolve,
      reject,
      timer: setTimeout(() => {
        const i = sock.closeQueue.indexOf(pending);
        if (i >= 0) {
          sock.closeQueue.splice(i, 1);
        }
        reject(newTimeoutError("close timeout", sock.traceId));
      }, 10_000),
    };
    sock.closeQueue.push(pending);

    try {
      sendWSMessage(sock, {
        type: "close",
        runId,
        nodeId,
        interactionId: (req.interactionId ?? "").trim(),
        reason: (req.reason ?? "").trim(),
      });
    } catch (err) {
      clearTimeout(pending.timer);
      const i = sock.closeQueue.indexOf(pending);
      if (i >= 0) {
        sock.closeQueue.splice(i, 1);
      }
      reject(err instanceof Error ? err : new Error(withTraceId(String(err), sock.traceId)));
    }
  });
};

export const onAssistantMessage = (
  runId: string,
  nodeId: string,
  cb: (msg: { interactionId: string; assistantMessage: string }) => void,
): (() => void) => {
  const sock = ensureRunSocket(runId, nodeId);
  sock.onAssistantMessage.add(cb);
  if (sock.assistantBacklog.length > 0) {
    const backlog = [...sock.assistantBacklog];
    sock.assistantBacklog = [];
    for (const item of backlog) {
      cb(item);
    }
  }
  return () => {
    const s = runSockets.get(sock.key);
    if (!s) {
      return;
    }
    s.onAssistantMessage.delete(cb);
  };
};
