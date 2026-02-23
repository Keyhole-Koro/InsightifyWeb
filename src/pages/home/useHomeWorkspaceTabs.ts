import type { UiWorkspaceTab } from "@/contracts/ui";
import { createUiTab, getUiWorkspace, selectUiTab } from "@/features/ui/api";

interface UseHomeWorkspaceTabsOptions {
  setStoredTabId: (projectId: string, tabId: string) => void;
}

export function useHomeWorkspaceTabs({
  setStoredTabId,
}: UseHomeWorkspaceTabsOptions) {
  const getWorkspaceTabs = async (
    activeProjectID: string,
  ): Promise<{ tabs: UiWorkspaceTab[]; activeTabId: string }> => {
    const res = await getUiWorkspace({ projectId: activeProjectID });
    return {
      tabs: res.tabs ?? [],
      activeTabId: (res.workspace?.activeTabId ?? "").trim(),
    };
  };

  const createTab = async (activeProjectID: string, title?: string) => {
    const res = await createUiTab({
      projectId: activeProjectID,
      title: (title ?? "").trim() || "Tab",
    });
    const tabId = (res.tab?.tabId ?? "").trim();
    if (!tabId) {
      throw new Error("CreateTab did not return tab_id");
    }
    setStoredTabId(activeProjectID, tabId);
    return tabId;
  };

  const selectTab = async (activeProjectID: string, tabID: string) => {
    const tid = (tabID ?? "").trim();
    if (!tid) {
      throw new Error("tab_id is required");
    }
    await selectUiTab({
      projectId: activeProjectID,
      tabId: tid,
    });
    setStoredTabId(activeProjectID, tid);
  };

  return {
    getWorkspaceTabs,
    createTab,
    selectTab,
  };
}
