import { useCallback, useState } from "react";

interface RestoreResult {
  restored: boolean;
  runId: string;
  tabId: string;
  source: "server" | "local_cache";
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
          `Restore succeeded (${restoreResult.source === "local_cache" ? "cache" : "server"}): tab=${restoreResult.tabId || "-"} / run=${restoreResult.runId || "-"}`,
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
        "No restore target. Initialized with a new run.",
      );
    },
    [restoreWithFallback],
  );

  const restoreForSelectedTab = useCallback(
    async (activeProjectID: string, tabID: string) => {
      return await restoreWithFallback(
        activeProjectID,
        tabID,
        "No restore target for selected tab. Initialized with a new run.",
      );
    },
    [restoreWithFallback],
  );

  const restoreForNewTab = useCallback(
    async (activeProjectID: string, tabID: string) => {
      return await restoreWithFallback(
        activeProjectID,
        tabID,
        "Created a new tab and initialized it with a new run.",
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
