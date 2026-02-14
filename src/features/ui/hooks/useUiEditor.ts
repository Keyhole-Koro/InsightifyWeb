import { useCallback } from "react";

import { applyUiOps } from "@/features/ui/api";
import type { UiDocument, UiNode, UiOp } from "@/contracts/ui";

interface UseUiEditorOptions {
  runId: string | null;
  document: UiDocument | null;
  setDocument: React.Dispatch<React.SetStateAction<UiDocument | null>>;
}

export function useUiEditor({ runId, document, setDocument }: UseUiEditorOptions) {
  const apply = useCallback(
    async (ops: UiOp[], actor = "frontend") => {
      const targetRunId = (runId ?? "").trim();
      if (!targetRunId) {
        throw new Error("runId is required");
      }

      const res = await applyUiOps({
        runId: targetRunId,
        baseVersion: document?.version ?? 0,
        ops,
        actor,
      });
      if (res.document) {
        setDocument(res.document);
      }
      return res;
    },
    [document?.version, runId, setDocument],
  );

  const upsertNode = useCallback(
    async (node: UiNode) => {
      return await apply([
        {
          upsertNode: { node },
        },
      ]);
    },
    [apply],
  );

  const deleteNode = useCallback(
    async (nodeId: string) => {
      return await apply([
        {
          deleteNode: { nodeId },
        },
      ]);
    },
    [apply],
  );

  const clearNodes = useCallback(async () => {
    return await apply([
      {
        clearNodes: {},
      },
    ]);
  }, [apply]);

  return {
    apply,
    upsertNode,
    deleteNode,
    clearNodes,
  };
}
