import { runClient } from "@/rpc/clients";
import {
  type StartRunRequest,
  type StartRunResponse,
  type WatchRunRequest,
} from "@/contracts/worker";
import { type ConnectError } from "@connectrpc/connect";

export { runClient };
export type { StartRunRequest, StartRunResponse, WatchRunRequest };

export const startRun = async (req: StartRunRequest): Promise<StartRunResponse> => {
    return await runClient.startRun(req);
};

export async function* watchRun(req: WatchRunRequest, signal?: AbortSignal) {
    for await (const res of runClient.watchRun(req, { signal })) {
        yield res;
    }
}
