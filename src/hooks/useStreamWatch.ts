import { useCallback, useRef } from "react";

import { watchChat } from "@/api/coreApi";
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
 * Re-watching is controlled by callers (e.g. after SendMessage).
 */
export function useStreamWatch() {
  const abortByConversationRef = useRef<Record<string, AbortController>>({});
  const lastSeqByConversationRef = useRef<Record<string, number>>({});

  const stream = useCallback(
    async (
      runId: string,
      conversationId: string,
      callbacks: StreamCallbacks,
      sessionId?: string,
    ): Promise<void> => {
      const watchKey = conversationId || runId;
      if (!watchKey) {
        callbacks.onError("runId or conversationId is required");
        return;
      }

      // Replace only the existing watcher for the same conversation scope.
      abortByConversationRef.current[watchKey]?.abort();
      abortByConversationRef.current[watchKey] = new AbortController();

      let accumulated = "";
      let resolvedConversationID = conversationId || watchKey;
      const fromSeq = lastSeqByConversationRef.current[resolvedConversationID] ?? 0;

      try {
        for await (const event of watchChat({ runId, sessionId, conversationId, fromSeq })) {
          const eventConversationID = (event.conversationId ?? "").trim();
          if (eventConversationID) {
            resolvedConversationID = eventConversationID;
            callbacks.onConversationResolved?.(eventConversationID);
          }
          if ((event.seq ?? 0) > 0 && resolvedConversationID) {
            lastSeqByConversationRef.current[resolvedConversationID] = event.seq ?? 0;
          }

          if (event.node) {
            callbacks.onNode?.(event.node);
          }

          if (
            event.eventType === "EVENT_TYPE_ASSISTANT_CHUNK" &&
            event.text
          ) {
            accumulated += event.text;
            callbacks.onChunk(accumulated);
            continue;
          }

          if (
            event.eventType === "EVENT_TYPE_UNSPECIFIED" &&
            event.text &&
            !event.interactionId
          ) {
            // Backward-compatible fallback for unspecified chunk-like events.
            accumulated += event.text;
            callbacks.onChunk(accumulated);
            continue;
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
            return;
          }

          if (event.eventType === "EVENT_TYPE_COMPLETE") {
            const finalText = (event.text ?? "").trim() || accumulated;
            callbacks.onComplete(finalText);
            return;
          }

          if (event.eventType === "EVENT_TYPE_ERROR") {
            const message = event.text || "Stream error";
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
          (message.includes("not found") || message.includes("session")) &&
          accumulated.trim() !== ""
        ) {
          callbacks.onComplete(accumulated);
          return;
        }

        callbacks.onError(message);
      } finally {
        delete abortByConversationRef.current[watchKey];
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    const controllers = Object.values(abortByConversationRef.current);
    for (const controller of controllers) {
      controller.abort();
    }
    abortByConversationRef.current = {};
  }, []);

  return { stream, cancel };
}
