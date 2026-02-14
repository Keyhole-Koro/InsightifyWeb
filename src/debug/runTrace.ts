import { apiBaseUrl } from "@/shared/env";

export interface FrontendRunTraceEvent {
  timestamp: string;
  run_id: string;
  source: "frontend";
  stage: string;
  level: "log" | "warn" | "error";
  fields?: Record<string, unknown>;
}

export interface CoreRunTraceEvent {
  timestamp: string;
  run_id: string;
  source: string;
  stage: string;
  fields?: Record<string, unknown>;
}

const STORAGE_KEY = "insightify.frontend.run_trace.v1";
const MAX_EVENTS = 1000;

const isDev = import.meta.env.DEV;

function normalizeRunID(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim();
}

function extractRunID(fields?: Record<string, unknown>): string {
  if (!fields) return "";
  return (
    normalizeRunID(fields.runId) ||
    normalizeRunID(fields.run_id) ||
    normalizeRunID(fields.activeRunId) ||
    normalizeRunID(fields["run-id"])
  );
}

function readAll(): FrontendRunTraceEvent[] {
  if (!isDev) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FrontendRunTraceEvent =>
        typeof item === "object" && item !== null,
    );
  } catch {
    return [];
  }
}

function writeAll(events: FrontendRunTraceEvent[]) {
  if (!isDev) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // Best effort in dev only.
  }
}

async function postFrontendTrace(event: FrontendRunTraceEvent) {
  if (!isDev) return;
  try {
    await fetch(`${apiBaseUrl}/debug/frontend-trace`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // Best effort in dev only.
  }
}

export function traceFrontend(
  stage: string,
  fields?: Record<string, unknown>,
  level: "log" | "warn" | "error" = "log",
) {
  if (!isDev) return;
  const runID = extractRunID(fields);
  const event: FrontendRunTraceEvent = {
    timestamp: new Date().toISOString(),
    run_id: runID,
    source: "frontend",
    stage,
    level,
    fields: fields ?? {},
  };
  const next = [...readAll(), event];
  writeAll(next);
  void postFrontendTrace(event);
  const payload = JSON.stringify(event);
  if (level === "warn") {
    console.warn("[trace]", payload);
    return;
  }
  if (level === "error") {
    console.error("[trace]", payload);
    return;
  }
  console.log("[trace]", payload);
}

export function readFrontendRunTrace(runID: string): FrontendRunTraceEvent[] {
  const target = normalizeRunID(runID);
  if (!target) return [];
  return readAll().filter((event) => event.run_id === target);
}

export function clearFrontendRunTrace(runID?: string) {
  if (!isDev) return;
  const target = normalizeRunID(runID ?? "");
  if (!target) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const filtered = readAll().filter((event) => event.run_id !== target);
  writeAll(filtered);
}

export async function fetchCoreRunTrace(runID: string): Promise<CoreRunTraceEvent[]> {
  const target = normalizeRunID(runID);
  if (!target) return [];
  const res = await fetch(
    `${apiBaseUrl}/debug/run-logs?run_id=${encodeURIComponent(target)}`,
    {
      credentials: "include",
    },
  );
  if (!res.ok) {
    throw new Error(`failed to fetch core trace: ${res.status}`);
  }
  const body = (await res.json()) as {
    run_id?: string;
    events?: CoreRunTraceEvent[];
  };
  if (!Array.isArray(body.events)) return [];
  return body.events;
}
