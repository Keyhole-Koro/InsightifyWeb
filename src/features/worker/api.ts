import { runClient } from "@/rpc/clients";
import {
  type StartRunRequest,
  type StartRunResponse,
} from "@/contracts/worker";

export { runClient };
export type { StartRunRequest, StartRunResponse };

export const startRun = async (req: StartRunRequest): Promise<StartRunResponse> => {
  return await runClient.startRun(req);
};
