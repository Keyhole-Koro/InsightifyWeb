import { interactionClient, runClient } from "@/rpc/clients";
import { type StartRunRequest, type StartRunResponse, type WaitForInputRequest, type WaitForInputResponse, type SendMessageRequest, type SendMessageResponse, type CloseInteractionRequest, type CloseInteractionResponse, type InitRunRequest, type InitRunResponse, type WatchRunRequest } from "@/shared/types/core";
import { type ConnectError } from "@connectrpc/connect";

export { runClient };
export type { StartRunRequest, StartRunResponse, WaitForInputRequest, WaitForInputResponse, SendMessageRequest, SendMessageResponse, CloseInteractionRequest, CloseInteractionResponse, InitRunRequest, InitRunResponse, WatchRunRequest };

export const startRun = async (req: StartRunRequest): Promise<StartRunResponse> => {
    return await runClient.startRun(req);
};

export const waitForInput = async (req: WaitForInputRequest): Promise<WaitForInputResponse> => {
    return await interactionClient.waitForInput(req);
};

export const sendMessage = async (req: SendMessageRequest): Promise<SendMessageResponse> => {
    return await interactionClient.sendUserMessage(req);
};

export const closeInteraction = async (req: CloseInteractionRequest): Promise<CloseInteractionResponse> => {
    return await interactionClient.closeInteraction(req);
};

export const initRun = async (req: InitRunRequest): Promise<InitRunResponse> => {
    return await runClient.init(req);
};

export async function* watchRun(req: WatchRunRequest, signal?: AbortSignal) {
    for await (const res of runClient.watchRun(req, { signal })) {
        yield res;
    }
}
