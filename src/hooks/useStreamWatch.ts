import { useCallback, useRef } from "react";

import { watchRun } from "@/api/coreApi";
import type { ChatNode } from "@/api/coreApi";
import { traceFrontend } from "@/debug/runTrace";

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
      traceFrontend("stream_open", { runId: watchKey });

      // Replace only the existing watcher for the same run.
      abortByRunRef.current[watchKey]?.abort();
      abortByRunRef.current[watchKey] = new AbortController();

      let accumulated = "";

      try {
        for await (const event of watchRun({ runId })) {
          traceFrontend("stream_event", {
            runId: watchKey,
            eventType: event.eventType,
            hasNode: Boolean(event.node),
            inputRequestId: event.inputRequestId ?? "",
            messageLen: (event.message ?? "").trim().length,
          });
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
            traceFrontend("stream_input_required", {
              runId: watchKey,
              inputRequestId: event.inputRequestId ?? "",
            });
            callbacks.onNeedUserInput(event.inputRequestId ?? "");
            return;
          }

          if (event.eventType === "EVENT_TYPE_NODE_READY") {
            // Node already forwarded above; no further action.
            continue;
          }

          if (event.eventType === "EVENT_TYPE_COMPLETE") {
            const finalText = (event.message ?? "").trim() || accumulated;
            traceFrontend("stream_complete", {
              runId: watchKey,
              finalTextLen: finalText.length,
            });
            callbacks.onComplete(finalText);
            return;
          }

          if (event.eventType === "EVENT_TYPE_ERROR") {
            const message = event.message || "Stream error";
            traceFrontend(
              "stream_error_event",
              {
                runId: watchKey,
                message,
              },
              "error",
            );
            callbacks.onError(message);
            return;
          }
        }

        traceFrontend("stream_finished_without_terminal", {
          runId: watchKey,
          accumulatedLen: accumulated.length,
        });
        callbacks.onComplete(accumulated);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        // watcher replacement and user cancellation should not surface as UI errors.
        if (message.toLowerCase().includes("aborted")) {
          traceFrontend("stream_aborted", { runId: watchKey });
          return;
        }

        // Recover closed run streams when we already have accumulated content.
        if (
          message.includes("not found") &&
          accumulated.trim() !== ""
        ) {
          traceFrontend(
            "stream_not_found_recovered",
            {
              runId: watchKey,
              accumulatedLen: accumulated.length,
            },
            "warn",
          );
          callbacks.onComplete(accumulated);
          return;
        }

        traceFrontend("stream_catch_error", { runId: watchKey, message }, "error");
        callbacks.onError(message);
      } finally {
        traceFrontend("stream_close", { runId: watchKey });
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
