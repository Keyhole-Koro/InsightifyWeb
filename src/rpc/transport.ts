import { createConnectTransport } from "@connectrpc/connect-web";
import { apiBaseUrl } from "@/shared/env";
import { TRACE_HEADER, newTraceId, setLastTraceId } from "@/shared/trace";

function withTraceHeader(init: RequestInit | undefined, traceId: string): RequestInit {
    const headers = new Headers(init?.headers ?? undefined);
    headers.set(TRACE_HEADER, traceId);
    return {
        ...(init ?? {}),
        headers,
    };
}

export const transport = createConnectTransport({
    baseUrl: apiBaseUrl,
    useBinaryFormat: false,
    fetch: async (input, init) => {
        const traceId = newTraceId();
        const req = withTraceHeader(init, traceId);
        try {
            const response = await fetch(input, {
                ...req,
                credentials: "include",
            });
            setLastTraceId(response.headers.get(TRACE_HEADER) ?? traceId);
            return response;
        } catch (err) {
            setLastTraceId(traceId);
            if (err instanceof Error) {
                throw new Error(`${err.message} (Trace ID: ${traceId})`);
            }
            throw err;
        }
    },
});
