import { useCallback, useMemo, useRef, useState } from "react";
import { useEdgesState, useNodesState } from "reactflow";

import { initRun } from "@/api/pipelineApi";
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
  const [showInitModal, setShowInitModal] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [repoName, setRepoName] = useState<string | null>(null);
  const [userIdInput, setUserIdInput] = useState("demo-user");
  const [repoUrlInput, setRepoUrlInput] = useState(
    "https://github.com/example/repo",
  );

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

  const handleOpenInitModal = useCallback(() => {
    setInitError(null);
    setShowInitModal(true);
  }, []);

  const handleCloseInitModal = useCallback(() => {
    if (initLoading) return;
    setShowInitModal(false);
  }, [initLoading]);

  const handleInitSubmit = useCallback(async () => {
    setInitLoading(true);
    setInitError(null);
    try {
      const res = await initRun({ userId: userIdInput, repoUrl: repoUrlInput });
      setSessionId(res.sessionId ?? null);
      setRepoName(res.repoName ?? null);
      setShowInitModal(false);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : String(err));
    } finally {
      setInitLoading(false);
    }
  }, [repoUrlInput, userIdInput]);

  const handlePlanClick = useCallback(() => {
    if (!sessionId) return;
    runPlan("worker_DAG", { repo_name: "PoliTopics" }, sessionId);
  }, [runPlan, sessionId]);

  const handleTestStreaming = useCallback(() => {
    if (!sessionId) return;
    runStreaming("test_pipeline", {}, sessionId);
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
              onClick={handleOpenInitModal}
              variant="secondary"
              style={{ position: "absolute", top: 16, right: 24, zIndex: 10 }}
            >
              Init Run
            </ActionButton>

            <ActionButton
              onClick={handleAddLLMChatNode}
              variant="secondary"
              style={{ position: "absolute", top: 16, right: 112, zIndex: 10 }}
            >
              Add LLM Chat Node
            </ActionButton>

            <ActionButton
              onClick={handleTestStreaming}
              variant="success"
              disabled={!isInitialized}
              style={{ position: "absolute", top: 16, right: 286, zIndex: 10 }}
            >
              Test Streaming
            </ActionButton>

            <ActionButton
              onClick={handlePlanClick}
              variant="primary"
              disabled={!isInitialized}
              style={{ position: "absolute", top: 16, right: 422, zIndex: 10 }}
            >
              Run Plan
            </ActionButton>

            <div
              style={{
                position: "absolute",
                top: 56,
                right: 24,
                zIndex: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
                color: "#334155",
              }}
            >
              {isInitialized
                ? `Initialized: ${repoName ?? "mock-repo"} (${sessionId})`
                : "Not initialized"}
            </div>

            {showInitModal ? (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(2, 6, 23, 0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    width: 420,
                    maxWidth: "90vw",
                    background: "#ffffff",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    padding: 20,
                    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.2)",
                  }}
                >
                  <h3 style={{ margin: 0, marginBottom: 12, fontSize: 18 }}>
                    Init Run
                  </h3>

                  <label
                    style={{ display: "block", marginBottom: 10, fontSize: 13 }}
                  >
                    User ID
                    <input
                      value={userIdInput}
                      onChange={(e) => setUserIdInput(e.target.value)}
                      style={{
                        marginTop: 6,
                        width: "100%",
                        boxSizing: "border-box",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        padding: "8px 10px",
                      }}
                    />
                  </label>

                  <label
                    style={{ display: "block", marginBottom: 12, fontSize: 13 }}
                  >
                    Repository URL
                    <input
                      value={repoUrlInput}
                      onChange={(e) => setRepoUrlInput(e.target.value)}
                      style={{
                        marginTop: 6,
                        width: "100%",
                        boxSizing: "border-box",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        padding: "8px 10px",
                      }}
                    />
                  </label>

                  {initError ? (
                    <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 10 }}>
                      {initError}
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <ActionButton
                      onClick={handleCloseInitModal}
                      variant="secondary"
                      disabled={initLoading}
                    >
                      Cancel
                    </ActionButton>
                    <ActionButton
                      onClick={handleInitSubmit}
                      variant="primary"
                      disabled={
                        initLoading ||
                        userIdInput.trim().length === 0 ||
                        repoUrlInput.trim().length === 0
                      }
                    >
                      {initLoading ? "Initializing..." : "Initialize"}
                    </ActionButton>
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
