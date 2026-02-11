import { useCallback, useState } from "react";

import { initRun } from "@/api/coreApi";
import { useStringStorage } from "@/hooks/useSessionStorage";

export interface RunSessionConfig {
  storageKey: string;
  defaultUserId: string;
  defaultRepoUrl?: string;
}

export function useRunSession(
  config: RunSessionConfig,
) {
  const [sessionId, setSessionId] = useStringStorage(config.storageKey);
  const [initError, setInitError] = useState<string | null>(null);

  const isSessionNotFoundError = useCallback((message: string) => {
    const text = message.toLowerCase();
    return text.includes("session") && text.includes("not found");
  }, []);

  const reinitSession = useCallback(async () => {
    const res = await initRun({
      userId: config.defaultUserId,
      repoUrl: config.defaultRepoUrl ?? "",
    });
    const sid = res.sessionId ?? "";
    if (!sid) {
      throw new Error("InitRun did not return session_id");
    }
    setSessionId(sid);
    return res;
  }, [
    config.defaultRepoUrl,
    config.defaultUserId,
    setSessionId,
  ]);

  return {
    sessionId,
    setSessionId,
    initError,
    setInitError,
    isSessionNotFoundError,
    reinitSession,
  };
}
