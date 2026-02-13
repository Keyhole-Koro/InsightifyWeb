import { useCallback, useRef } from "react";

import { watchRun } from "@/api/coreApi";
import type { ChatNode } from "@/api/coreApi";

export interface StreamEvent {
  eventType?: string;
  text?: string;
  interactionId?: string;
  node?: ChatNode;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (finalText: string) => void;
  onError: (message: string) => void;
  onNeedUserInput: (inputRequestId: string) => void;
  onConversationResolved?: (conversationId: string) => void;
  onNode?: (node: ChatNode) => void;
}

/**
 * One watch call handles exactly one stream lifecycle.
 * Re-watching is controlled by callers (e.g. after SubmitInput).
 */
export function useStreamWatch() {
  const abortByRunRef = useRef<Record<string, AbortController>>({});

  const stream = useCallback(
    async (
      runId: string,
      _conversationId: string,
      callbacks: StreamCallbacks,
      _projectId?: string,
    ): Promise<void> => {
      const watchKey = runId;
      if (!watchKey) {
        callbacks.onError("runId is required");
        return;
      }

      // Replace only the existing watcher for the same run.
      abortByRunRef.current[watchKey]?.abort();
      abortByRunRef.current[watchKey] = new AbortController();

      let accumulated = "";

      try {
        for await (const event of watchRun({ runId })) {
          // Forward UI node events.
          if (event.node) {
            callbacks.onNode?.(event.node);
          }

          if (
            event.eventType === "EVENT_TYPE_LOG" &&
            event.message
          ) {
            accumulated += event.message;
            callbacks.onChunk(accumulated);
            continue;
          }

          if (event.eventType === "EVENT_TYPE_PROGRESS") {
            continue;
          }

          if (event.eventType === "EVENT_TYPE_INPUT_REQUIRED") {
            callbacks.onNeedUserInput(event.inputRequestId ?? "");
            return;
          }

          if (event.eventType === "EVENT_TYPE_NODE_READY") {
            // Node already forwarded above; no further action.
            continue;
          }

          if (event.eventType === "EVENT_TYPE_COMPLETE") {
            const finalText = (event.message ?? "").trim() || accumulated;
            callbacks.onComplete(finalText);
            return;
          }

          if (event.eventType === "EVENT_TYPE_ERROR") {
            const message = event.message || "Stream error";
            callbacks.onError(message);
            return;
          }
        }

        callbacks.onComplete(accumulated);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        // watcher replacement and user cancellation should not surface as UI errors.
        if (message.toLowerCase().includes("aborted")) {
          return;
        }

        // Recover closed run streams when we already have accumulated content.
        if (
          message.includes("not found") &&
          accumulated.trim() !== ""
        ) {
          callbacks.onComplete(accumulated);
          return;
        }

        callbacks.onError(message);
      } finally {
        delete abortByRunRef.current[watchKey];
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    const controllers = Object.values(abortByRunRef.current);
    for (const controller of controllers) {
      controller.abort();
    }
    abortByRunRef.current = {};
  }, []);

  return { stream, cancel };
}
