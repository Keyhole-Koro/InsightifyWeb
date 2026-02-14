import { useRef } from "react";

export function useInteractionState() {
  const runIdByNodeRef = useRef<Record<string, string>>({});
  const pendingInteractionByNodeRef = useRef<Record<string, string>>({});

  const getRunId = (nodeId: string) => (runIdByNodeRef.current[nodeId] ?? "").trim();
  const setRunId = (nodeId: string, runId: string) => {
    runIdByNodeRef.current[nodeId] = runId;
  };

  const getPendingInteractionId = (nodeId: string) =>
    (pendingInteractionByNodeRef.current[nodeId] ?? "").trim();
  const setPendingInteractionId = (nodeId: string, interactionId: string) => {
    pendingInteractionByNodeRef.current[nodeId] = interactionId;
  };
  const clearPendingInteractionId = (nodeId: string) => {
    pendingInteractionByNodeRef.current[nodeId] = "";
  };

  return {
    getRunId,
    setRunId,
    getPendingInteractionId,
    setPendingInteractionId,
    clearPendingInteractionId,
  };
}
