import { interactionClient } from "@/rpc/clients";
import { type CloseRequest, type CloseResponse, type SendRequest, type SendResponse, type WaitRequest, type WaitResponse } from "@/shared/types/core";

export { interactionClient };
export type { CloseRequest, CloseResponse, SendRequest, SendResponse, WaitRequest, WaitResponse };

export const wait = async (req: WaitRequest): Promise<WaitResponse> => {
    return await interactionClient.wait({
        runId: req.runId,
        timeoutMs: req.timeoutMs,
    });
};

export const send = async (req: SendRequest): Promise<SendResponse> => {
    return await interactionClient.send({
        runId: req.runId,
        interactionId: req.interactionId,
        input: req.input,
    });
};

export const close = async (req: CloseRequest): Promise<CloseResponse> => {
    return await interactionClient.close({
        runId: req.runId,
        interactionId: req.interactionId,
        reason: req.reason,
    });
};
