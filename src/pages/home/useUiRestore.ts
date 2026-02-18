import { useCallback, useState } from "react";

interface RestoreResult {
  restored: boolean;
  runId: string;
  tabId: string;
}

interface UseUiRestoreOptions {
  resetBootstrapScene: () => void;
  restoreLatestTab: (
    activeProjectID: string,
    preferredTabID?: string,
  ) => Promise<RestoreResult>;
  runBootstrap: (activeProjectID: string) => Promise<void>;
  refreshWorkspaceTabs: (activeProjectID: string) => Promise<void>;
}

export function useUiRestore({
  resetBootstrapScene,
  restoreLatestTab,
  runBootstrap,
  refreshWorkspaceTabs,
}: UseUiRestoreOptions) {
  const [restoreStatus, setRestoreStatus] = useState<string>("");

  const clearRestoreStatus = useCallback(() => {
    setRestoreStatus("");
  }, []);

  const restoreWithFallback = useCallback(
    async (
      activeProjectID: string,
      preferredTabID: string | undefined,
      fallbackMessage: string,
    ) => {
      resetBootstrapScene();
      const restoreResult = await restoreLatestTab(activeProjectID, preferredTabID);
      if (!restoreResult.restored) {
        await runBootstrap(activeProjectID);
        setRestoreStatus(fallbackMessage);
      } else {
        setRestoreStatus(
          `復元成功: tab=${restoreResult.tabId || "-"} / run=${restoreResult.runId || "-"}`,
        );
      }
      await refreshWorkspaceTabs(activeProjectID);
      return restoreResult;
    },
    [refreshWorkspaceTabs, resetBootstrapScene, restoreLatestTab, runBootstrap],
  );

  const restoreForProject = useCallback(
    async (activeProjectID: string) => {
      return await restoreWithFallback(
        activeProjectID,
        undefined,
        "復元なし: 新規実行で初期化しました",
      );
    },
    [restoreWithFallback],
  );

  const restoreForSelectedTab = useCallback(
    async (activeProjectID: string, tabID: string) => {
      return await restoreWithFallback(
        activeProjectID,
        tabID,
        "復元なし: 選択タブを新規実行で初期化しました",
      );
    },
    [restoreWithFallback],
  );

  const restoreForNewTab = useCallback(
    async (activeProjectID: string, tabID: string) => {
      return await restoreWithFallback(
        activeProjectID,
        tabID,
        "新規タブを作成し、初期実行しました",
      );
    },
    [restoreWithFallback],
  );

  return {
    restoreStatus,
    clearRestoreStatus,
    restoreForProject,
    restoreForSelectedTab,
    restoreForNewTab,
  };
}

