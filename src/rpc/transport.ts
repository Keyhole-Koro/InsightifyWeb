import { createConnectTransport } from "@connectrpc/connect-web";
import { apiBaseUrl } from "@/shared/env";

export const transport = createConnectTransport({
    baseUrl: apiBaseUrl,
    useBinaryFormat: false,
    fetch: (input, init) =>
        fetch(input, {
            ...init,
            credentials: "include",
        }),
});
