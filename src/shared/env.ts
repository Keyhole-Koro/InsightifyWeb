export const defaultBase =
    (import.meta.env.VITE_API_URL as string | undefined) ??
    "http://localhost:8080";

export const apiBaseUrl = defaultBase.replace(/\/$/, "");
