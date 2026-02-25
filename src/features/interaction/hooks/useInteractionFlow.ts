import { useCallback, useEffect, useRef } from "react";

import { onAssistantMessage, send, wait } from "@/features/interaction/api";
import { useInteractionState } from "@/features/interaction/hooks/useInteractionState";
import { startRun } from "@/features/worker/api";
import { getLastTraceId } from "@/shared/trace";
import type { ActTimelineEvent } from "@/features/worker/types/graphTypes";

interface UseInteractionFlowOptions {
  setInitError: (value: string | null) => void;
  appendActTimelineEvent: (
    targetNodeID: string,
    event: ActTimelineEvent,
    status?: string,
    mode?: string,
  ) => void;
}

const buildEvent = (kind: string, summary: string, detail?: string): ActTimelineEvent => ({
  id: `evt-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
  createdAtUnixMs: Date.now(),
  kind,
  summary,
  detail,
});

export function useInteractionFlow({
  setInitError,
  appendActTimelineEvent,
}: UseInteractionFlowOptions) {
  const interactionSession = useInteractionState();
  const offByNodeRef = useRef<Record<string, () => void>>({});

  const startWorkerRun = useCallback(async (
    workerKey: string,
    activeProjectId: string,
    params: Record<string, string> = {},
  ) => {
    const res = await startRun({ projectId: activeProjectId, workerId: workerKey, params });
    const runId = (res.runId ?? "").trim();
    if (!runId) {
      throw new Error(`StartRun did not return run_id for ${workerKey}`);
    }
    return runId;
  }, []);

  const setNodeRunId = useCallback((nodeId: string, runId: string) => {
    const targetNodeId = (nodeId ?? "").trim();
    const targetRunId = (runId ?? "").trim();
    if (!targetNodeId || !targetRunId) {
      return;
    }
    interactionSession.setRunId(targetNodeId, targetRunId);
  }, [interactionSession]);

  const initInteractionNode = useCallback(
    async (runId: string, nodeId: string) => {
      const prevRunId = interactionSession.getRunId(nodeId);
      interactionSession.setRunId(nodeId, runId);
      if (prevRunId !== "" && prevRunId !== runId) {
        interactionSession.clearPendingInteractionId(nodeId);
      }

      offByNodeRef.current[nodeId]?.();
      offByNodeRef.current[nodeId] = onAssistantMessage(
        runId,
        nodeId,
        ({ interactionId, assistantMessage }) => {
          const incomingInteractionID = (interactionId ?? "").trim();
          const expectedInteractionID = interactionSession.getPendingInteractionId(nodeId);
          if (
            expectedInteractionID &&
            incomingInteractionID &&
            incomingInteractionID !== expectedInteractionID
          ) {
            return;
          }
          if (incomingInteractionID !== "") {
            interactionSession.setPendingInteractionId(nodeId, incomingInteractionID);
          }
          const trimmed = (assistantMessage ?? "").trim();
          if (!trimmed) {
            return;
          }
          appendActTimelineEvent(
            nodeId,
            buildEvent("worker_output", trimmed, incomingInteractionID || undefined),
            "needs_user_action",
            "needs_user_action",
          );
        },
      );

      const waiting = await wait({ runId, nodeId, timeoutMs: 5_000 });
      interactionSession.setPendingInteractionId(
        nodeId,
        (waiting.interactionId ?? "").trim(),
      );
    },
    [appendActTimelineEvent, interactionSession],
  );

  const submitNodeInput = useCallback(
    async (nodeId: string, input: string) => {
      const targetNodeId = (nodeId ?? "").trim();
      const submitted = (input ?? "").trim();
      if (!targetNodeId || !submitted) {
        return;
      }
      const runId = interactionSession.getRunId(targetNodeId);
      if (!runId) {
        throw new Error(`No active run for act node: ${targetNodeId}`);
      }

      appendActTimelineEvent(
        targetNodeId,
        buildEvent("user_input", submitted),
        "planning",
        "planning",
      );

      try {
        const interactionId = interactionSession.getPendingInteractionId(targetNodeId);
        const res = await send({
          runId,
          nodeId: targetNodeId,
          interactionId,
          input: submitted,
        });

        if (!res.accepted) {
          appendActTimelineEvent(
            targetNodeId,
            buildEvent("system_note", "input not accepted"),
          );
          return;
        }

        interactionSession.clearPendingInteractionId(targetNodeId);
        interactionSession.setPendingInteractionId(
          targetNodeId,
          (res.interactionId ?? interactionId ?? "").trim(),
        );

        const assistant = (res.assistantMessage ?? "").trim();
        if (assistant) {
          appendActTimelineEvent(
            targetNodeId,
            buildEvent(
              "worker_output",
              assistant,
              (res.interactionId ?? interactionId ?? "").trim() || undefined,
            ),
            "needs_user_action",
            "needs_user_action",
          );
        }
      } catch (err) {
        const rawMessage = err instanceof Error ? err.message : String(err);
        const lastTraceId = getLastTraceId();
        const message = lastTraceId && !rawMessage.includes("Trace ID:")
          ? `${rawMessage} (Trace ID: ${lastTraceId})`
          : rawMessage;
        setInitError(message);
        appendActTimelineEvent(
          targetNodeId,
          buildEvent("worker_error", message),
          "failed",
          "failed",
        );
      }
    },
    [appendActTimelineEvent, interactionSession, setInitError],
  );

  const cancelStream = useCallback(() => undefined, []);

  useEffect(() => {
    return () => {
      const entries = Object.entries(offByNodeRef.current);
      for (const [, off] of entries) {
        off();
      }
      offByNodeRef.current = {};
    };
  }, []);

  return {
    startWorkerRun,
    initInteractionNode,
    setNodeRunId,
    submitNodeInput,
    cancelStream,
  };
}
