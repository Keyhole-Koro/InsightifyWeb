import { useCallback, useRef, useState } from "react";

export type RunStatus = "running" | "complete" | "error";

export interface RunItem {
  clientId: string;
  id: string;
  workerKey: string;
  title: string;
  status: RunStatus;
  log: string | null;
  progressPercent?: number;
  startedAt: string;
  finishedAt?: string;
}

const nowIso = () => new Date().toISOString();

export function useRunManager() {
  const [inProgress, setInProgress] = useState<RunItem[]>([]);
  const [completed, setCompleted] = useState<RunItem[]>([]);
  const completedClientIds = useRef(new Set<string>());

  const moveToCompleted = useCallback((run: RunItem, status: RunStatus) => {
    if (completedClientIds.current.has(run.clientId)) {
      return;
    }
    completedClientIds.current.add(run.clientId);
    const finishedRun: RunItem = {
      ...run,
      status,
      finishedAt: nowIso(),
    };
    setCompleted((current) => [finishedRun, ...current]);
  }, []);

  const dismissCompleted = useCallback((clientId: string) => {
    completedClientIds.current.delete(clientId);
    setCompleted((current) =>
      current.filter((run) => run.clientId !== clientId),
    );
  }, []);

  return {
    inProgress,
    completed,
    moveToCompleted,
    dismissCompleted,
  };
}
