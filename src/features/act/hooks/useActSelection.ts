import { useCallback, useState } from "react";

export function useActSelection(initialActId: string | null = null) {
  const [selectedActId, setSelectedActId] = useState<string | null>(
    initialActId,
  );

  const selectAct = useCallback((actId: string | null | undefined) => {
    const next = (actId ?? "").trim();
    setSelectedActId(next || null);
  }, []);

  return {
    selectedActId,
    selectAct,
  };
}
