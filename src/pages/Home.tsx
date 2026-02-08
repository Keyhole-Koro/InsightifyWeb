import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEdgesState, useNodesState } from "reactflow";

import { initRun, submitRunInput, watchRun } from "@/api/pipelineApi";
import { FloatingNodeSamples } from "@/components/floating";
import { LLMInputNode } from "@/components/graph/LLMInputNode/LLMInputNode";
import { HomeShell } from "@/components/home/HomeShell";
import { GraphLayers, WatchRunViewer } from "@/components/run";
import { ActionButton } from "@/components/ui/ActionButton";
import { useRunManager } from "@/hooks/useRunManager";
import type {
  GraphNodeRegistry,
  LLMInputNodeData,
  RuntimeGraphNode,
} from "@/types/graphTypes";

export const Home = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<LLMInputNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [initError, setInitError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [repoName, setRepoName] = useState<string | null>(null);
  const [userIdInput, setUserIdInput] = useState("demo-user");
  const [repoUrlInput, setRepoUrlInput] = useState(
    "https://github.com/Keyhole-Koro/PoliTopics.git",
  );
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [purposeRunId, setPurposeRunId] = useState<string | null>(null);
  const [purposeInput, setPurposeInput] = useState("");
  const [purposeSubmitting, setPurposeSubmitting] = useState(false);
  const [purposeAwaitingInput, setPurposeAwaitingInput] = useState(false);
  const [purposeMessages, setPurposeMessages] = useState<
    Array<{ id: string; role: "assistant" | "user"; content: string }>
  >([]);

  const nodeSeq = useRef(1);
  const msgSeq = useRef(1);

  const { inProgress, completed, runPlan, runStreaming, dismissCompleted } =
    useRunManager({
      onNodesChange: setNodes,
      onEdgesChange: setEdges,
    });

  const isInitialized = useMemo(() => Boolean(sessionId), [sessionId]);
  const nodeTypes = useMemo<GraphNodeRegistry>(
    () => ({ llmChat: LLMInputNode }),
    [],
  );

  const buildMockReply = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return "入力を受け取りました。もう少し具体化すると、より精度の高い返答ができます。";
    }
    if (trimmed.length <= 20) {
      return `「${trimmed}」について整理します。目的・制約・期待結果を教えてください。`;
    }
    return `了解しました。\n\n要点:\n- 依頼内容: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? "..." : ""}\n- 次アクション: まず要件を分解し、実装候補を提示します。`;
  }, []);

  const handleNodeInputChange = useCallback(
    (nodeId: string, value: string) => {
      setNodes((current) =>
        current.map((node) => {
          if (node.id !== nodeId) return node;
          const data = node.data as LLMInputNodeData;
          return {
            ...node,
            data: {
              ...data,
              props: {
                ...data.props,
                input: value,
              },
            },
          };
        }),
      );
    },
    [setNodes],
  );

  const handleNodeSend = useCallback(
    (nodeId: string) => {
      let submitted = "";

      setNodes((current) =>
        current.map((node) => {
          if (node.id !== nodeId) return node;
          const data = node.data as LLMInputNodeData;
          const content = data.props.input.trim();
          if (!content || data.props.isResponding) return node;

          submitted = content;
          return {
            ...node,
            data: {
              ...data,
              props: {
                ...data.props,
                input: "",
                isResponding: true,
                messages: [
                  ...data.props.messages,
                  {
                    id: `msg-${msgSeq.current++}`,
                    role: "user",
                    content,
                  },
                ],
              },
            },
          };
        }),
      );

      if (!submitted) return;

      setTimeout(() => {
        const reply = buildMockReply(submitted);
        setNodes((current) =>
          current.map((node) => {
            if (node.id !== nodeId) return node;
            const data = node.data as LLMInputNodeData;
            return {
              ...node,
              data: {
                ...data,
                props: {
                  ...data.props,
                  isResponding: false,
                  messages: [
                    ...data.props.messages,
                    {
                      id: `msg-${msgSeq.current++}`,
                      role: "assistant",
                      content: reply,
                    },
                  ],
                },
              },
            };
          }),
        );
      }, 700);
    },
    [buildMockReply, setNodes],
  );

  const handleAddLLMChatNode = useCallback(() => {
    const id = `llm-input-${Date.now()}-${nodeSeq.current++}`;
    const nextNode: RuntimeGraphNode<"llmChat"> = {
      id,
      type: "llmChat",
      position: {
        x: 100 + ((nodeSeq.current - 1) % 2) * 460,
        y: 110 + Math.floor((nodeSeq.current - 1) / 2) * 420,
      },
      data: {
        type: "llmChat",
        meta: {
          title: "LLM Chat",
        },
        props: {
          model: "Mock",
          input: "",
          isResponding: false,
          messages: [
            {
              id: `msg-${msgSeq.current++}`,
              role: "assistant",
              content: "こんにちは。ここで質問してください。",
            },
          ],
          onInputChange: (value: string) => handleNodeInputChange(id, value),
          onSend: () => handleNodeSend(id),
        },
      },
    };

    setNodes((current) => [...current, nextNode]);
  }, [handleNodeInputChange, handleNodeSend, setNodes]);

  const streamInitPurpose = useCallback(async (runId: string) => {
    setPurposeRunId(runId);
    let assistantDraft = "";
    setPurposeMessages((current) => {
      const next = [...current];
      if (!next.length || next[next.length - 1].role !== "assistant") {
        next.push({ id: `msg-${Date.now()}`, role: "assistant", content: "" });
      }
      return next;
    });
    for await (const event of watchRun({ runId })) {
      if (event.message && event.eventType === "EVENT_TYPE_LOG") {
        assistantDraft += event.message;
        setPurposeMessages((current) => {
          if (!current.length) return current;
          const next = [...current];
          const last = next[next.length - 1];
          if (last.role !== "assistant") {
            next.push({
              id: `msg-${Date.now()}`,
              role: "assistant",
              content: assistantDraft,
            });
            return next;
          }
          next[next.length - 1] = {
            ...last,
            content: assistantDraft,
          };
          return next;
        });
      }

      if (event.eventType === "EVENT_TYPE_COMPLETE") {
        if (event.message === "INPUT_REQUIRED") {
          setPurposeAwaitingInput(true);
          setPurposeSubmitting(false);
        } else {
          setPurposeAwaitingInput(false);
          setPurposeSubmitting(false);
          setShowPurposeModal(false);
        }
      }

      if (event.eventType === "EVENT_TYPE_ERROR") {
        setPurposeAwaitingInput(false);
        setPurposeSubmitting(false);
      }
    }
  }, []);

  useEffect(() => {
    if (sessionId) return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await initRun({ userId: userIdInput, repoUrl: repoUrlInput });
        if (cancelled) return;
        setSessionId(res.sessionId ?? null);
        setRepoName(res.repoName ?? null);
        if (res.bootstrapRunId) {
          setPurposeMessages([]);
          setShowPurposeModal(true);
          setPurposeAwaitingInput(false);
          setPurposeSubmitting(true);
          void streamInitPurpose(res.bootstrapRunId);
        }
      } catch (err) {
        if (cancelled) return;
        setInitError(err instanceof Error ? err.message : String(err));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [repoUrlInput, sessionId, streamInitPurpose, userIdInput]);

  const handlePurposeSubmit = useCallback(async () => {
    if (!sessionId || !purposeInput.trim()) return;
    const text = purposeInput.trim();
    setPurposeMessages((current) => [
      ...current,
      { id: `msg-${Date.now()}`, role: "user", content: text },
    ]);
    setPurposeInput("");
    setPurposeSubmitting(true);
    setPurposeAwaitingInput(false);
    try {
      const res = await submitRunInput({
        sessionId,
        runId: purposeRunId ?? undefined,
        input: text,
      });
      const nextRunId = res.runId ?? "";
      if (!nextRunId) {
        setPurposeSubmitting(false);
        return;
      }
      setPurposeMessages((current) => [
        ...current,
        { id: `msg-${Date.now()}-a`, role: "assistant", content: "" },
      ]);
      void streamInitPurpose(nextRunId);
    } catch (err) {
      setPurposeSubmitting(false);
      setPurposeAwaitingInput(true);
      setInitError(err instanceof Error ? err.message : String(err));
    }
  }, [purposeInput, purposeRunId, sessionId, streamInitPurpose]);

  const handlePlanClick = useCallback(() => {
    if (!sessionId) return;
    setInitError(null);
    void runPlan("worker_DAG", { repo_name: "PoliTopics" }, sessionId).catch(
      (err) => {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("session") && message.includes("not found")) {
          setSessionId(null);
          setRepoName(null);
          setInitError(
            "Session expired on API server. Please initialize again.",
          );
          return;
        }
        setInitError(message);
      },
    );
  }, [runPlan, sessionId]);

  const handleTestStreaming = useCallback(() => {
    if (!sessionId) return;
    setInitError(null);
    void runStreaming("test_pipeline", {}, sessionId).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("session") && message.includes("not found")) {
        setSessionId(null);
        setRepoName(null);
        setInitError("Session expired on API server. Please initialize again.");
        return;
      }
      setInitError(message);
    });
  }, [runStreaming, sessionId]);

  return (
    <HomeShell
      layout={{ background: "#ffffff", showGraphBackground: true }}
      graphConfig={{
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        fitView: true,
        nodeTypes,
      }}
      slots={{
        actions: (
          <>
            <ActionButton
              onClick={handleAddLLMChatNode}
              variant="secondary"
              style={{ position: "absolute", top: 16, right: 24, zIndex: 10 }}
            >
              Add LLM Chat Node
            </ActionButton>

            <ActionButton
              onClick={handleTestStreaming}
              variant="success"
              disabled={!isInitialized}
              style={{ position: "absolute", top: 16, right: 198, zIndex: 10 }}
            >
              Test Streaming
            </ActionButton>

            <ActionButton
              onClick={handlePlanClick}
              variant="primary"
              disabled={!isInitialized}
              style={{ position: "absolute", top: 16, right: 334, zIndex: 10 }}
            >
              Run Plan
            </ActionButton>

            <div
              style={{
                position: "absolute",
                top: 60,
                right: 24,
                zIndex: 10,
                background:
                  "linear-gradient(135deg, rgba(248,250,252,0.95) 0%, rgba(238,242,255,0.9) 100%)",
                border: "1px solid rgba(148,163,184,0.5)",
                backdropFilter: "blur(6px)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 12,
                color: "#334155",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
                fontFamily: 'var(--font-ui, "Manrope", "Segoe UI", sans-serif)',
              }}
            >
              {isInitialized
                ? `Session Ready · ${repoName ?? "mock-repo"} (${sessionId})`
                : "Session Not Initialized"}
            </div>

            {showPurposeModal ? (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backdropFilter: "blur(6px)",
                  background: "rgba(255,255,255,0.52)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  zIndex: 1100,
                }}
              >
                <div
                  style={{
                    width: "min(100%, 1200px)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    paddingLeft: "clamp(24px, 10vw, 180px)",
                    paddingRight: "clamp(24px, 10vw, 180px)",
                  }}
                >
                  <div
                    style={{
                      padding: 20,
                      overflowY: "auto",
                      flex: 1,
                    }}
                  >
                    {purposeMessages.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: "flex",
                          justifyContent:
                            m.role === "user" ? "flex-end" : "flex-start",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "78%",
                            whiteSpace: "pre-wrap",
                            fontSize: 14,
                            lineHeight: 1.6,
                            borderRadius: 16,
                            padding: "10px 14px",
                            border:
                              m.role === "user"
                                ? "1px solid rgba(15, 23, 42, 0.65)"
                                : "1px solid rgba(148, 163, 184, 0.38)",
                            background:
                              m.role === "user"
                                ? "#0f172a"
                                : "rgba(255,255,255,0.9)",
                            color: m.role === "user" ? "#f8fafc" : "#0f172a",
                          }}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      padding: 14,
                      borderTop: "1px solid rgba(148, 163, 184, 0.22)",
                    }}
                  >
                    <textarea
                      value={purposeInput}
                      onChange={(e) => setPurposeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (purposeInput.trim()) {
                            void handlePurposeSubmit();
                          }
                        }
                      }}
                      placeholder="気になるテーマ or GitHub URL を入力..."
                      rows={3}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        border: "1px solid rgba(148,163,184,0.55)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        resize: "none",
                        fontSize: 14,
                        lineHeight: 1.5,
                        background: "rgba(255,255,255,0.92)",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {purposeSubmitting
                          ? "Assistant is thinking..."
                          : purposeAwaitingInput
                            ? "Reply to continue"
                            : "Starting..."}
                      </span>
                      <ActionButton
                        onClick={handlePurposeSubmit}
                        variant="primary"
                        disabled={!purposeInput.trim()}
                      >
                        Send
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ),
        runOverlay: <WatchRunViewer runs={inProgress} />,
        runSidebar: (
          <GraphLayers runs={completed} onCloseRun={dismissCompleted} />
        ),
        floating: <FloatingNodeSamples />,
      }}
    />
  );
};
