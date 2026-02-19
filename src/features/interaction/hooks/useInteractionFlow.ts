import { useCallback, useEffect, useRef, type MutableRefObject } from "react";

import { onAssistantMessage, send, wait } from "@/features/interaction/api";
import { useInteractionState } from "@/features/interaction/hooks/useInteractionState";
import { startRun } from "@/features/worker/api";
import { useUiEditor } from "@/features/ui/hooks/useUiEditor";
import { useUiNodeState } from "@/features/ui/hooks/useUiNodeState";
import type { UiNode } from "@/contracts/ui";

interface UseInteractionFlowOptions {
  projectId: string | null;
  setProjectId: (value: string | null) => void;
  setInitError: (value: string | null) => void;
  ensureActiveProject: () => Promise<{ projectId?: string }>;
  isProjectNotFoundError: (message: string) => boolean;
  msgSeq: MutableRefObject<number>;
  nodeState: ReturnType<typeof useUiNodeState>;
  upsertNodeFromRpc: (targetNodeID: string, node: UiNode) => void;
  bindHandlers: (
    onInputChange: (nodeId: string, value: string) => void,
    onSend: (nodeId: string) => void,
  ) => void;
}

export function useInteractionFlow({
  projectId,
  setProjectId,
  setInitError,
  ensureActiveProject,
  isProjectNotFoundError,
  msgSeq,
  nodeState,
  upsertNodeFromRpc,
  bindHandlers,
}: UseInteractionFlowOptions) {
  const interactionSession = useInteractionState();
  const uiEditor = useUiEditor();
  const offByNodeRef = useRef<Record<string, () => void>>({});
  const shadowNodeRef = useRef<Record<string, UiNode>>({});

  const ensureShadowNode = useCallback((nodeId: string): UiNode => {
    const targetNodeId = (nodeId ?? "").trim();
    const existing = shadowNodeRef.current[targetNodeId];
    if (existing) {
      return existing;
    }
    const next: UiNode = {
      id: targetNodeId,
      type: "UI_NODE_TYPE_LLM_CHAT",
      meta: { title: targetNodeId },
      llmChat: {
        model: "Low",
        isResponding: false,
        sendLocked: false,
        sendLockHint: "",
        messages: [],
      },
    };
    shadowNodeRef.current[targetNodeId] = next;
    return next;
  }, []);

  const persistShadowNode = useCallback(
    (nodeId: string) => {
      const targetNodeId = (nodeId ?? "").trim();
      const runId = interactionSession.getRunId(targetNodeId);
      const node = shadowNodeRef.current[targetNodeId];
      if (!runId || !node) {
        return;
      }
      void uiEditor.upsertNode(runId, node, "frontend").catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        setInitError(`ApplyOps failed: ${message}`);
      });
    },
    [interactionSession, setInitError, uiEditor],
  );

  const setShadowResponding = useCallback((nodeId: string, isResponding: boolean) => {
    const node = ensureShadowNode(nodeId);
    node.llmChat = {
      ...(node.llmChat ?? {}),
      isResponding,
    };
  }, [ensureShadowNode]);

  const appendShadowMessage = useCallback(
    (nodeId: string, role: "ROLE_USER" | "ROLE_ASSISTANT", content: string) => {
      const trimmed = (content ?? "").trim();
      if (!trimmed) {
        return;
      }
      const node = ensureShadowNode(nodeId);
      const llm = node.llmChat ?? {
        model: "Low",
        isResponding: false,
        sendLocked: false,
        sendLockHint: "",
        messages: [],
      };
      llm.messages = [
        ...(llm.messages ?? []),
        {
          id: `msg-${Date.now()}-${Math.random()}`,
          role,
          content: trimmed,
        },
      ];
      node.llmChat = llm;
    },
    [ensureShadowNode],
  );

  const upsertLastAssistantShadow = useCallback(
    (nodeId: string, content: string) => {
      const trimmed = (content ?? "").trim();
      if (!trimmed) {
        return;
      }
      const node = ensureShadowNode(nodeId);
      const llm = node.llmChat ?? {
        model: "Low",
        isResponding: false,
        sendLocked: false,
        sendLockHint: "",
        messages: [],
      };
      const messages = [...(llm.messages ?? [])];
      const last = messages[messages.length - 1];
      if (last?.role === "ROLE_ASSISTANT") {
        messages[messages.length - 1] = { ...last, content: trimmed };
      } else {
        messages.push({
          id: `msg-${Date.now()}-${Math.random()}`,
          role: "ROLE_ASSISTANT",
          content: trimmed,
        });
      }
      llm.messages = messages;
      node.llmChat = llm;
    },
    [ensureShadowNode],
  );

  const ensureNodeShell = useCallback(
    (nodeId: string) => {
      const shadow = ensureShadowNode(nodeId);
      setShadowResponding(nodeId, true);
      upsertNodeFromRpc(nodeId, shadow);
      nodeState.setResponding(nodeId, true);
      nodeState.ensureServerMessage(nodeId);
      persistShadowNode(nodeId);
    },
    [ensureShadowNode, nodeState, persistShadowNode, setShadowResponding, upsertNodeFromRpc],
  );

  const initInteractionNode = useCallback(
    async (runId: string, nodeId: string) => {
      const prevRunId = interactionSession.getRunId(nodeId);
      interactionSession.setRunId(nodeId, runId);
      if (prevRunId !== "" && prevRunId !== runId) {
        interactionSession.clearPendingInteractionId(nodeId);
      }

      ensureNodeShell(nodeId);
      offByNodeRef.current[nodeId]?.();
      offByNodeRef.current[nodeId] = onAssistantMessage(runId, ({ interactionId, assistantMessage }) => {
        // First assistant message can arrive before React commits node creation.
        // Ensure the node exists before mutating chat messages.
        ensureNodeShell(nodeId);
        nodeState.updateLastServerMessage(nodeId, assistantMessage);
        upsertLastAssistantShadow(nodeId, assistantMessage);
        if (interactionId !== "") {
          interactionSession.setPendingInteractionId(nodeId, interactionId);
        }
        nodeState.setResponding(nodeId, false);
        setShadowResponding(nodeId, false);
        persistShadowNode(nodeId);
      });
      const waiting = await wait({ runId, timeoutMs: 5_000 });
      interactionSession.setPendingInteractionId(
        nodeId,
        (waiting.interactionId ?? "").trim(),
      );
      nodeState.setResponding(nodeId, false);
      setShadowResponding(nodeId, false);
      persistShadowNode(nodeId);
    },
    [
      ensureNodeShell,
      interactionSession,
      nodeState,
      persistShadowNode,
      setShadowResponding,
      upsertLastAssistantShadow,
    ],
  );

  const startWorkerRun = useCallback(async (workerKey: string, activeProjectId: string) => {
    const res = await startRun({ projectId: activeProjectId, workerId: workerKey, params: {} });
    const runId = (res.runId ?? "").trim();
    if (!runId) {
      throw new Error(`StartRun did not return run_id for ${workerKey}`);
    }
    return runId;
  }, []);
  const setNodeRunId = useCallback((nodeId: string, runId: string, version?: number) => {
    const targetNodeId = (nodeId ?? "").trim();
    const targetRunId = (runId ?? "").trim();
    if (!targetNodeId || !targetRunId) {
      return;
    }
    interactionSession.setRunId(targetNodeId, targetRunId);
    uiEditor.setRunVersion(targetRunId, version);
  }, [interactionSession, uiEditor]);
  const cancelStream = useCallback(() => undefined, []);

  const handleInputChange = useCallback(
    (nodeId: string, value: string) => nodeState.setInput(nodeId, value),
    [nodeState],
  );

  const handleSend = useCallback(
    (nodeId: string) => {
      const submitted = nodeState.clearInputAndAddUserMessage(nodeId, msgSeq);
      if (!submitted) {
        return;
      }

      void (async () => {
        try {
          let activeProjectId = (projectId ?? "").trim();
          if (!activeProjectId) {
            const ensuredProject = await ensureActiveProject();
            activeProjectId = (ensuredProject.projectId ?? "").trim();
            if (!activeProjectId) {
              throw new Error("EnsureProject did not return project_id");
            }
          }

          const runId = interactionSession.getRunId(nodeId);
          if (!runId) {
            throw new Error("No active run for this node.");
          }
          appendShadowMessage(nodeId, "ROLE_USER", submitted);
          setShadowResponding(nodeId, true);
          persistShadowNode(nodeId);

          const interactionId = interactionSession.getPendingInteractionId(nodeId);
          const res = await send({
            runId,
            interactionId,
            input: submitted,
          });

          if (!res.accepted) {
            nodeState.setResponding(nodeId, false);
            setShadowResponding(nodeId, false);
            persistShadowNode(nodeId);
            return;
          }

          const assistant = (res.assistantMessage ?? "").trim();
          if (assistant) {
            nodeState.addMessage(nodeId, {
              id: `msg-${Date.now()}`,
              role: "assistant",
                content: assistant,
              });
            nodeState.updateLastServerMessage(nodeId, assistant);
            upsertLastAssistantShadow(nodeId, assistant);
          }
          interactionSession.clearPendingInteractionId(nodeId);
          interactionSession.setPendingInteractionId(
            nodeId,
            (res.interactionId ?? interactionId ?? "").trim(),
          );
          nodeState.setResponding(nodeId, true);
          setShadowResponding(nodeId, true);
          persistShadowNode(nodeId);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (isProjectNotFoundError(message)) {
            setProjectId(null);
          }
          setInitError(message);
          nodeState.addMessage(nodeId, {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: message,
          });
          nodeState.setResponding(nodeId, false);
          upsertLastAssistantShadow(nodeId, message);
          setShadowResponding(nodeId, false);
          persistShadowNode(nodeId);
        }
      })();
    },
    [
      appendShadowMessage,
      isProjectNotFoundError,
      msgSeq,
      nodeState,
      projectId,
      persistShadowNode,
      ensureActiveProject,
      setInitError,
      setProjectId,
      setShadowResponding,
      interactionSession,
      upsertLastAssistantShadow,
    ],
  );

  useEffect(() => {
    bindHandlers(handleInputChange, handleSend);
  }, [bindHandlers, handleInputChange, handleSend]);

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
    cancelStream,
  };
}
