import { useCallback, useRef } from "react";

import { watchChat } from "@/api/coreApi";
import type { ChatNode } from "@/api/coreApi";

const WATCH_RETRY_LIMIT = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  onNode?: (node: ChatNode) => void;
}

/**
 * Unified hook for SSE streaming with retry logic.
 */
export function useStreamWatch() {
  const abortByRunRef = useRef<Record<string, AbortController>>({});

  const stream = useCallback(
    async (
      runId: string,
      callbacks: StreamCallbacks,
      sessionId?: string,
    ): Promise<void> => {
      // Cancel only the existing stream for the same run.
      abortByRunRef.current[runId]?.abort();
      abortByRunRef.current[runId] = new AbortController();

      let accumulated = "";
      let terminalReached = false;

      for (
        let attempt = 0;
        attempt <= WATCH_RETRY_LIMIT && !terminalReached;
        attempt += 1
      ) {
        let sawAnyEvent = false;

        try {
          for await (const event of watchChat({ runId, sessionId })) {
            sawAnyEvent = true;
            if (event.node) {
              callbacks.onNode?.(event.node);
            }

            if (
              event.eventType === "EVENT_TYPE_ASSISTANT_CHUNK" &&
              event.text
            ) {
              accumulated += event.text;
              callbacks.onChunk(accumulated);
            }

            if (event.eventType === "EVENT_TYPE_ASSISTANT_FINAL" && event.text) {
              accumulated = event.text;
              callbacks.onChunk(accumulated);
              continue;
            }

            if (event.eventType === "EVENT_TYPE_NEED_INPUT") {
              callbacks.onNeedUserInput(event.interactionId ?? "");
              if (event.text) {
                accumulated = event.text;
                callbacks.onChunk(accumulated);
              }
              continue;
            }

            if (event.eventType === "EVENT_TYPE_COMPLETE") {
              terminalReached = true;
              const finalText = (event.text ?? "").trim() || accumulated;
              callbacks.onComplete(finalText);
              break;
            }

            if (event.eventType === "EVENT_TYPE_ERROR") {
              terminalReached = true;
              callbacks.onError(event.text || "Stream error");
              break;
            }
          }

          // Stream ended without terminal event but we got data
          if (!terminalReached && sawAnyEvent) {
            terminalReached = true;
            callbacks.onComplete(accumulated);
            break;
          }

          if (!terminalReached && !sawAnyEvent) {
            throw new Error("Stream interrupted");
          }
        } catch (err) {
          if (terminalReached) break;

          const message = err instanceof Error ? err.message : String(err);

          // Server cleaned up the run - treat as success if we have content
          if (
            (message.includes("not found") || message.includes("session")) &&
            accumulated.trim() !== ""
          ) {
            terminalReached = true;
            callbacks.onComplete(accumulated);
            break;
          }

          if (attempt >= WATCH_RETRY_LIMIT) {
            callbacks.onError(`Reconnect failed: ${message}`);
            break;
          }

          await sleep(300 * (attempt + 1));
        }
      }
      delete abortByRunRef.current[runId];
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
