import { uiClient, uiWorkspaceClient } from "@/rpc/clients";
import type {
  ApplyUiOpsRequest,
  ApplyUiOpsResponse,
  CreateUiTabRequest,
  CreateUiTabResponse,
  GetUiWorkspaceRequest,
  GetUiWorkspaceResponse,
  GetProjectUiDocumentRequest,
  GetProjectUiDocumentResponse,
  GetUiDocumentRequest,
  GetUiDocumentResponse,
  ListUiTabsRequest,
  ListUiTabsResponse,
  SelectUiTabRequest,
  SelectUiTabResponse,
} from "@/contracts/ui";

export { uiClient };
export type {
  ApplyUiOpsRequest,
  ApplyUiOpsResponse,
  CreateUiTabRequest,
  CreateUiTabResponse,
  GetUiWorkspaceRequest,
  GetUiWorkspaceResponse,
  GetProjectUiDocumentRequest,
  GetProjectUiDocumentResponse,
  GetUiDocumentRequest,
  GetUiDocumentResponse,
  ListUiTabsRequest,
  ListUiTabsResponse,
  SelectUiTabRequest,
  SelectUiTabResponse,
};

export const getUiDocument = async (
  req: GetUiDocumentRequest,
): Promise<GetUiDocumentResponse> => {
  return await uiClient.getDocument({
    runId: req.runId,
  });
};

export const applyUiOps = async (
  req: ApplyUiOpsRequest,
): Promise<ApplyUiOpsResponse> => {
  return await uiClient.applyOps({
    runId: req.runId,
    baseVersion: req.baseVersion ?? 0,
    ops: req.ops,
    actor: req.actor ?? "",
  });
};

export const getProjectUiDocument = async (
  req: GetProjectUiDocumentRequest,
): Promise<GetProjectUiDocumentResponse> => {
  return await uiClient.getProjectTabDocument({
    projectId: req.projectId,
    tabId: req.tabId ?? "",
  });
};

export const getUiWorkspace = async (
  req: GetUiWorkspaceRequest,
): Promise<GetUiWorkspaceResponse> => {
  return await uiWorkspaceClient.getWorkspace({
    projectId: req.projectId,
  });
};

export const listUiTabs = async (
  req: ListUiTabsRequest,
): Promise<ListUiTabsResponse> => {
  return await uiWorkspaceClient.listTabs({
    projectId: req.projectId,
  });
};

export const createUiTab = async (
  req: CreateUiTabRequest,
): Promise<CreateUiTabResponse> => {
  return await uiWorkspaceClient.createTab({
    projectId: req.projectId,
    title: req.title ?? "",
  });
};

export const selectUiTab = async (
  req: SelectUiTabRequest,
): Promise<SelectUiTabResponse> => {
  return await uiWorkspaceClient.selectTab({
    projectId: req.projectId,
    tabId: req.tabId,
  });
};
