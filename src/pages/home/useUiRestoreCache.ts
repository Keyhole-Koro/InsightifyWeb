import type { UiDocument } from "@/contracts/ui";

const PROJECT_TAB_STORAGE_PREFIX = "insightify.ui_tab_id.";
const PROJECT_TAB_DOCUMENT_CACHE_PREFIX = "insightify.ui_doc_cache.";

type LocalDocumentCache = {
  runId: string;
  documentHash: string;
  document: UiDocument;
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
  source: "server" | "local_cache";
};

const normalize = (value?: string): string => (value ?? "").trim();

const readCache = (projectId: string, tabId: string): LocalDocumentCache | null => {
  const pid = normalize(projectId);
  const tid = normalize(tabId);
  if (!pid || !tid) {
    return null;
  }
  const raw = localStorage.getItem(`${PROJECT_TAB_DOCUMENT_CACHE_PREFIX}${pid}.${tid}`);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as LocalDocumentCache;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
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
    localStorage.removeItem(`${PROJECT_TAB_DOCUMENT_CACHE_PREFIX}${pid}.${tid}`);
  };

  const resolveDocument = ({
    projectId,
    tabId,
    runId,
    serverDocument,
    serverHash,
  }: ResolveDocumentInput): ResolveDocumentResult => {
    const normalizedHash = normalize(serverHash);
    const normalizedRunId = normalize(runId);
    if (!normalizedHash || !normalizedRunId) {
      return {
        document: serverDocument,
        documentHash: normalizedHash,
        source: "server",
      };
    }

    const cached = readCache(projectId, tabId);
    const useCache =
      !!cached &&
      normalize(cached.runId) === normalizedRunId &&
      normalize(cached.documentHash) === normalizedHash &&
      !!cached.document;
    if (useCache) {
      return {
        document: cached?.document,
        documentHash: normalizedHash,
        source: "local_cache",
      };
    }
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
    document?: UiDocument,
  ): void => {
    const pid = normalize(projectId);
    const tid = normalize(tabId);
    const rid = normalize(runId);
    const hash = normalize(documentHash);
    if (!pid || !tid || !rid || !hash || !document) {
      return;
    }
    const payload: LocalDocumentCache = {
      runId: rid,
      documentHash: hash,
      document,
      savedAt: Date.now(),
    };
    localStorage.setItem(
      `${PROJECT_TAB_DOCUMENT_CACHE_PREFIX}${pid}.${tid}`,
      JSON.stringify(payload),
    );
  };

  return {
    getStoredTabId,
    setStoredTabId,
    clearDocumentCache,
    resolveDocument,
    saveDocumentCache,
  };
}
