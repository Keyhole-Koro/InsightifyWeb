import { uiClient } from "@/rpc/clients";
import type {
  ApplyUiOpsRequest,
  ApplyUiOpsResponse,
  GetUiDocumentRequest,
  GetUiDocumentResponse,
} from "@/contracts/ui";

export { uiClient };
export type {
  ApplyUiOpsRequest,
  ApplyUiOpsResponse,
  GetUiDocumentRequest,
  GetUiDocumentResponse,
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
