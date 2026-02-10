import { useCallback, useRef } from "react";

import { watchRun } from "@/api/coreApi";

const WATCH_RETRY_LIMIT = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface StreamEvent {
  eventType?: string;
  message?: string;
  clientView?: {
    llmResponse?: string;
    graph?: {
      nodes?: Array<{ uid?: string; description?: string }>;
    };
  };
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (finalText: string) => void;
  onError: (message: string) => void;
  onNeedUserInput: (inputRequestId: string) => void;
}

const INPUT_REQUIRED_PREFIX = "INPUT_REQUIRED:";

export function parseInputRequiredMessage(message?: string): string {
  const text = (message ?? "").trim();
  if (!text.startsWith(INPUT_REQUIRED_PREFIX)) return "";
  return text.slice(INPUT_REQUIRED_PREFIX.length).trim();
}

/**
 * Extract assistant message from clientView if available.
 */
export function extractAssistantFromView(
  event: StreamEvent,
  assistantUid = "init-purpose-assistant",
): string {
  const directResponse = (event.clientView?.llmResponse ?? "").trim();
  if (directResponse !== "") {
    return directResponse;
  }
  const nodes = event.clientView?.graph?.nodes ?? [];
  const match = nodes.find((node) => node.uid === assistantUid);
  return (match?.description ?? "").trim();
}

/**
 * Unified hook for SSE streaming with retry logic.
 */
export function useStreamWatch() {
  const abortRef = useRef<AbortController | null>(null);

  const stream = useCallback(
    async (runId: string, callbacks: StreamCallbacks): Promise<void> => {
      // Cancel any existing stream
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      let accumulated = "";
      let terminalReached = false;

      for (
        let attempt = 0;
        attempt <= WATCH_RETRY_LIMIT && !terminalReached;
        attempt += 1
      ) {
        let sawAnyEvent = false;

        try {
          for await (const event of watchRun({ runId })) {
            sawAnyEvent = true;

            if (event.eventType === "EVENT_TYPE_LOG" && event.message) {
              accumulated += event.message;
              callbacks.onChunk(accumulated);
            }

            if (event.eventType === "EVENT_TYPE_PROGRESS") {
              const inputRequestId = parseInputRequiredMessage(event.message);
              if (inputRequestId) {
                callbacks.onNeedUserInput(inputRequestId);
                const assistant = extractAssistantFromView(event);
                if (assistant) {
                  callbacks.onChunk(assistant);
                }
                continue;
              }
            }

            if (event.eventType === "EVENT_TYPE_COMPLETE") {
              terminalReached = true;
              const finalText = extractAssistantFromView(event) || accumulated;
              callbacks.onComplete(finalText);
              break;
            }

            if (event.eventType === "EVENT_TYPE_ERROR") {
              terminalReached = true;
              callbacks.onError(event.message || "Stream error");
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
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  return { stream, cancel };
}
