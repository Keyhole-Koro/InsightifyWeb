import { useCallback, useEffect, useState } from "react";

import { getUiDocument } from "@/features/ui/api";
import type { UiDocument } from "@/contracts/ui";

export function useUiDocument(runId: string | null) {
  const [document, setDocument] = useState<UiDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const targetRunId = (runId ?? "").trim();
    if (!targetRunId) {
      setDocument(null);
      setError(null);
      return null;
    }

    setLoading(true);
    try {
      const res = await getUiDocument({ runId: targetRunId });
      const next = res.document ?? { runId: targetRunId, version: 0, nodes: [] };
      setDocument(next);
      setError(null);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    document,
    loading,
    error,
    reload,
    setDocument,
  };
}
