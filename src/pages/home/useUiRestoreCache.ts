import type { UiDocument } from "@/contracts/ui";

const PROJECT_TAB_STORAGE_PREFIX = "insightify.ui_tab_id.";
const PROJECT_TAB_META_CACHE_PREFIX = "insightify.ui_doc_meta.";

type LocalDocumentMetaCache = {
  runId: string;
  documentHash: string;
  savedAt: number;
};

type ResolveDocumentInput = {
  projectId: string;
  tabId: string;
  runId: string;
  serverDocument?: UiDocument;
  serverHash?: string;
};

type ResolveDocumentResult = {
  document?: UiDocument;
  documentHash: string;
  source: "server";
};

const normalize = (value?: string): string => (value ?? "").trim();
const readMetaCache = (projectId: string, tabId: string): LocalDocumentMetaCache | null => {
  const pid = normalize(projectId);
  const tid = normalize(tabId);
  if (!pid || !tid) {
    return null;
  }
  const raw = localStorage.getItem(`${PROJECT_TAB_META_CACHE_PREFIX}${pid}.${tid}`);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as LocalDocumentMetaCache;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn("[ui-restore] failed to parse local cache", {
      projectId: pid,
      tabId: tid,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
};

export function useUiRestoreCache() {
  const getStoredTabId = (projectId: string): string => {
    const pid = normalize(projectId);
    if (!pid) {
      return "";
    }
    return normalize(localStorage.getItem(`${PROJECT_TAB_STORAGE_PREFIX}${pid}`) ?? "");
  };

  const setStoredTabId = (projectId: string, tabId: string): void => {
    const pid = normalize(projectId);
    const tid = normalize(tabId);
    if (!pid) {
      return;
    }
    if (!tid) {
      localStorage.removeItem(`${PROJECT_TAB_STORAGE_PREFIX}${pid}`);
      return;
    }
    localStorage.setItem(`${PROJECT_TAB_STORAGE_PREFIX}${pid}`, tid);
  };

  const clearDocumentCache = (projectId: string, tabId: string): void => {
    const pid = normalize(projectId);
    const tid = normalize(tabId);
    if (!pid || !tid) {
      return;
    }
    localStorage.removeItem(`${PROJECT_TAB_META_CACHE_PREFIX}${pid}.${tid}`);
  };

  const resolveDocument = ({
    projectId,
    tabId,
    runId,
    serverDocument,
    serverHash,
  }: ResolveDocumentInput): ResolveDocumentResult => {
    const pid = normalize(projectId);
    const tid = normalize(tabId);
    const normalizedHash = normalize(serverHash);
    const normalizedRunId = normalize(runId);
    const cached = readMetaCache(projectId, tabId);
    console.debug("[ui-restore] cache decision", {
      projectId: pid,
      tabId: tid,
      runId: normalizedRunId,
      documentHash: normalizedHash,
      hasCache: !!cached,
      cachedRunId: normalize(cached?.runId),
      cachedHash: normalize(cached?.documentHash),
      source: "server",
      serverNodeCount: serverDocument?.nodes?.length ?? 0,
      cachedSavedAt: cached?.savedAt ?? null,
    });
    return {
      document: serverDocument,
      documentHash: normalizedHash,
      source: "server",
    };
  };

  const saveDocumentCache = (
    projectId: string,
    tabId: string,
    runId: string,
    documentHash: string,
    _document?: UiDocument,
  ): void => {
    const pid = normalize(projectId);
    const tid = normalize(tabId);
    const rid = normalize(runId);
    const hash = normalize(documentHash);
    if (!pid || !tid || !rid || !hash) {
      return;
    }
    const payload: LocalDocumentMetaCache = {
      runId: rid,
      documentHash: hash,
      savedAt: Date.now(),
    };
    localStorage.setItem(
      `${PROJECT_TAB_META_CACHE_PREFIX}${pid}.${tid}`,
      JSON.stringify(payload),
    );
    console.debug("[ui-restore] cache saved", {
      projectId: pid,
      tabId: tid,
      runId: rid,
      documentHash: hash,
      savedAt: payload.savedAt,
    });
  };

  return {
    getStoredTabId,
    setStoredTabId,
    clearDocumentCache,
    resolveDocument,
    saveDocumentCache,
  };
}
