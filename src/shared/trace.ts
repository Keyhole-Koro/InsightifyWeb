export const TRACE_HEADER = "X-Trace-Id";

let lastTraceId = "";
let currentTraceScopeId = "";

function randomHex(bytes: number): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return Math.random().toString(16).slice(2).padEnd(bytes * 2, "0").slice(0, bytes * 2);
}

export function newTraceId(): string {
  return `trc_${Date.now()}_${randomHex(8)}`;
}

export function setLastTraceId(traceId: string): void {
  const v = (traceId ?? "").trim();
  if (!v) {
    return;
  }
  lastTraceId = v;
  currentTraceScopeId = v;
}

export function getLastTraceId(): string {
  return lastTraceId;
}

export function getCurrentTraceScopeId(): string {
  return currentTraceScopeId;
}
