export const defaultBase =
    (import.meta.env.VITE_API_URL as string | undefined) ??
    "";

export const apiBaseUrl = defaultBase.replace(/\/$/, "");
