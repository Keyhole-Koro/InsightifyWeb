import { useCallback, useEffect, useRef } from "react";

import { applyUiOps } from "@/features/ui/api";
import type { ApplyUiOpsResponse, UiNode, UiOp } from "@/contracts/ui";

const BATCH_WINDOW_MS = 180;
const RETRY_BASE_MS = 300;
const RETRY_MAX_MS = 2_000;
const MAX_RETRY_ATTEMPTS = 5;

type PendingCall = {
  ops: UiOp[];
  actor: string;
  resolve: (value: ApplyUiOpsResponse) => void;
  reject: (reason?: unknown) => void;
};

type PendingBatch = {
  calls: PendingCall[];
  attempt: number;
};

type RunQueue = {
  version: number;
  queuedCalls: PendingCall[];
  retryBatch: PendingBatch | null;
  inFlight: boolean;
  flushTimer: ReturnType<typeof setTimeout> | null;
  retryTimer: ReturnType<typeof setTimeout> | null;
};

const createQueue = (): RunQueue => ({
  version: 0,
  queuedCalls: [],
  retryBatch: null,
  inFlight: false,
  flushTimer: null,
  retryTimer: null,
});

const normalize = (value?: string): string => (value ?? "").trim();

export function useUiEditor() {
  const queuesRef = useRef<Map<string, RunQueue>>(new Map());

  const getQueue = useCallback((runId: string): RunQueue => {
    const key = normalize(runId);
    const existing = queuesRef.current.get(key);
    if (existing) {
      return existing;
    }
    const next = createQueue();
    queuesRef.current.set(key, next);
    return next;
  }, []);

  const clearQueueTimers = useCallback((queue: RunQueue) => {
    if (queue.flushTimer) {
      clearTimeout(queue.flushTimer);
      queue.flushTimer = null;
    }
    if (queue.retryTimer) {
      clearTimeout(queue.retryTimer);
      queue.retryTimer = null;
    }
  }, []);

  const rejectAll = useCallback((queue: RunQueue, reason: string) => {
    const error = new Error(reason);
    for (const call of queue.queuedCalls) {
      call.reject(error);
    }
    queue.queuedCalls = [];
    if (queue.retryBatch) {
      for (const call of queue.retryBatch.calls) {
        call.reject(error);
      }
      queue.retryBatch = null;
    }
    queue.inFlight = false;
  }, []);

  const sendBatch = useCallback(
    async (runId: string, queue: RunQueue, pending: PendingBatch): Promise<void> => {
      queue.inFlight = true;
      const ops = pending.calls.flatMap((c) => c.ops);
      const actor = pending.calls[pending.calls.length - 1]?.actor ?? "frontend";
      try {
        const res = await applyUiOps({
          runId,
          baseVersion: queue.version,
          ops,
          actor,
        });
        if (res.document && typeof res.document.version === "number") {
          queue.version = res.document.version;
        } else if (typeof res.currentVersion === "number") {
          queue.version = res.currentVersion;
        }

        if (res.conflict) {
          if (pending.attempt >= MAX_RETRY_ATTEMPTS) {
            throw new Error(res.conflictMessage || "apply ops conflict");
          }
          pending.attempt += 1;
          queue.retryBatch = pending;
          const delay = Math.min(RETRY_BASE_MS * 2 ** (pending.attempt - 1), RETRY_MAX_MS);
          queue.retryTimer = setTimeout(() => {
            queue.retryTimer = null;
            const retry = queue.retryBatch;
            queue.retryBatch = null;
            if (!retry) {
              return;
            }
            void sendBatch(runId, queue, retry);
          }, delay);
          return;
        }

        for (const call of pending.calls) {
          call.resolve(res);
        }
      } catch (err) {
        if (pending.attempt >= MAX_RETRY_ATTEMPTS) {
          for (const call of pending.calls) {
            call.reject(err);
          }
          return;
        }
        pending.attempt += 1;
        queue.retryBatch = pending;
        const delay = Math.min(RETRY_BASE_MS * 2 ** (pending.attempt - 1), RETRY_MAX_MS);
        queue.retryTimer = setTimeout(() => {
          queue.retryTimer = null;
          const retry = queue.retryBatch;
          queue.retryBatch = null;
          if (!retry) {
            return;
          }
          void sendBatch(runId, queue, retry);
        }, delay);
      } finally {
        queue.inFlight = false;
        if (!queue.retryBatch && queue.queuedCalls.length > 0) {
          if (queue.flushTimer) {
            clearTimeout(queue.flushTimer);
          }
          queue.flushTimer = setTimeout(() => {
            queue.flushTimer = null;
            const snapshot = queue.queuedCalls;
            if (snapshot.length === 0 || queue.inFlight || queue.retryBatch) {
              return;
            }
            queue.queuedCalls = [];
            void sendBatch(runId, queue, {
              calls: snapshot,
              attempt: 0,
            });
          }, BATCH_WINDOW_MS);
        }
      }
    },
    [],
  );

  const scheduleFlush = useCallback(
    (runId: string) => {
      const key = normalize(runId);
      if (!key) {
        return;
      }
      const queue = getQueue(key);
      if (queue.flushTimer || queue.retryBatch || queue.inFlight) {
        return;
      }
      queue.flushTimer = setTimeout(() => {
        queue.flushTimer = null;
        if (queue.inFlight || queue.retryBatch || queue.queuedCalls.length === 0) {
          return;
        }
        const snapshot = queue.queuedCalls;
        queue.queuedCalls = [];
        void sendBatch(key, queue, {
          calls: snapshot,
          attempt: 0,
        });
      }, BATCH_WINDOW_MS);
    },
    [getQueue, sendBatch],
  );

  useEffect(() => {
    return () => {
      for (const [, queue] of queuesRef.current) {
        clearQueueTimers(queue);
        rejectAll(queue, "ui editor unmounted while ops were pending");
      }
      queuesRef.current.clear();
    };
  }, [clearQueueTimers, rejectAll]);

  const setRunVersion = useCallback(
    (runId: string, version?: number) => {
      const key = normalize(runId);
      if (!key || typeof version !== "number" || Number.isNaN(version)) {
        return;
      }
      const queue = getQueue(key);
      queue.version = Math.max(queue.version, version);
    },
    [getQueue],
  );

  const apply = useCallback(
    async (runId: string, ops: UiOp[], actor = "frontend") => {
      const key = normalize(runId);
      if (!key) {
        throw new Error("run_id is required");
      }
      if (ops.length === 0) {
        return {
          conflict: false,
          currentVersion: getQueue(key).version,
        } as ApplyUiOpsResponse;
      }

      return await new Promise<ApplyUiOpsResponse>((resolve, reject) => {
        const queue = getQueue(key);
        queue.queuedCalls.push({
          ops,
          actor,
          resolve,
          reject,
        });
        scheduleFlush(key);
      });
    },
    [getQueue, scheduleFlush],
  );

  const upsertNode = useCallback(
    async (runId: string, node: UiNode, actor = "frontend") => {
      return await apply(
        runId,
        [
          {
            upsertNode: { node },
          },
        ],
        actor,
      );
    },
    [apply],
  );

  const deleteNode = useCallback(
    async (runId: string, nodeId: string, actor = "frontend") => {
      return await apply(
        runId,
        [
          {
            deleteNode: { nodeId },
          },
        ],
        actor,
      );
    },
    [apply],
  );

  const clearNodes = useCallback(
    async (runId: string, actor = "frontend") => {
      return await apply(
        runId,
        [
          {
            clearNodes: {},
          },
        ],
        actor,
      );
    },
    [apply],
  );

  const clearRunQueue = useCallback(
    (runId: string, reason = "run queue cleared") => {
      const key = normalize(runId);
      if (!key) {
        return;
      }
      const queue = queuesRef.current.get(key);
      if (!queue) {
        return;
      }
      clearQueueTimers(queue);
      rejectAll(queue, reason);
      queuesRef.current.delete(key);
    },
    [clearQueueTimers, rejectAll],
  );

  return {
    setRunVersion,
    apply,
    upsertNode,
    deleteNode,
    clearNodes,
    clearRunQueue,
  };
}

