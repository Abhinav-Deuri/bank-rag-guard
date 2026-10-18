import { ApiError, errorFromResponse } from "./errors";
import type {
  AskRequest,
  AskResponse,
  AuditEntry,
  AuditResponse,
  DemoUser,
  HealthResponse,
  RevealListing,
  RevealRequestRow,
  SourceChunk,
} from "./types";

/** Model calls can be slow (guard, embedding, answer, plus provider retries). */
export const ASK_TIMEOUT_MS = 120_000;

interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bad(what: string): never {
  throw new ApiError("bad_response", `The backend's ${what} response wasn't in the expected shape.`);
}

function parseUsers(value: unknown): DemoUser[] {
  if (!Array.isArray(value)) bad("user list");
  return (value as unknown[]).map((item) => {
    if (!isRecord(item) || typeof item.username !== "string" || typeof item.role !== "string" || typeof item.tier !== "number") {
      return bad("user list");
    }
    return { username: item.username, role: item.role, tier: item.tier };
  });
}

function parseSource(item: unknown): SourceChunk {
  if (
    !isRecord(item) ||
    typeof item.id !== "number" ||
    typeof item.source !== "string" ||
    typeof item.tier !== "number" ||
    typeof item.score !== "number" ||
    typeof item.text !== "string"
  ) {
    return bad("answer");
  }
  return { id: item.id, source: item.source, tier: item.tier, score: item.score, text: item.text };
}

function parseAsk(value: unknown): AskResponse {
  if (
    !isRecord(value) ||
    typeof value.username !== "string" ||
    typeof value.tier !== "number" ||
    typeof value.answer !== "string"
  ) {
    return bad("answer");
  }
  const counts: Record<string, number> = {};
  if (isRecord(value.masked_in_context)) {
    for (const [label, n] of Object.entries(value.masked_in_context)) {
      if (typeof n === "number") counts[label] = n;
    }
  }
  const answerCounts: Record<string, number> = {};
  if (isRecord(value.masked_in_answer)) {
    for (const [label, n] of Object.entries(value.masked_in_answer)) {
      if (typeof n === "number") answerCounts[label] = n;
    }
  }
  const dropped = typeof value.dropped_passages === "number" ? value.dropped_passages : 0;
  const learned = typeof value.learned_attacks_count === "number" ? value.learned_attacks_count : 0;
  const sources = Array.isArray(value.sources) ? value.sources.map(parseSource) : [];
  return {
    username: value.username,
    tier: value.tier,
    blocked: value.blocked === true,
    answer: value.answer,
    dropped_passages: dropped,
    masked_in_context: counts,
    masked_in_answer: answerCounts,
    learned_attacks_count: learned,
    reason: typeof value.reason === "string" ? value.reason : null,
    answer_id: typeof value.answer_id === "number" ? value.answer_id : null,
    sources,
  };
}

function parseAudit(value: unknown): AuditResponse {
  if (!isRecord(value) || typeof value.ok !== "boolean" || typeof value.message !== "string" || !Array.isArray(value.entries)) {
    return bad("audit");
  }
  const entries: AuditEntry[] = value.entries.map((e) => {
    if (!isRecord(e) || typeof e.id !== "number") return bad("audit");
    return {
      id: e.id,
      actor: typeof e.actor === "string" ? e.actor : String(e.actor ?? ""),
      action: typeof e.action === "string" ? e.action : String(e.action ?? ""),
      details: typeof e.details === "string" ? e.details : JSON.stringify(e.details ?? ""),
      ts: typeof e.ts === "string" ? e.ts : undefined,
      hash: typeof e.hash === "string" ? e.hash : undefined,
      prevHash: typeof e.prev_hash === "string" ? e.prev_hash : undefined,
    };
  });
  return { ok: value.ok, message: value.message, entries };
}

function parseHealth(value: unknown): HealthResponse {
  if (!isRecord(value) || typeof value.status !== "string") return bad("health");
  return { status: value.status };
}

async function request<T>(
  path: string,
  init: RequestInit,
  parse: (value: unknown) => T,
  { signal, timeoutMs = 30_000 }: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    let response: Response;
    let text: string;
    try {
      response = await fetch(path, { ...init, cache: "no-store", signal: controller.signal });
      text = await response.text();
    } catch {
      if (timedOut) {
        throw new ApiError(
          "timeout",
          "This is taking longer than expected, so the browser stopped waiting. The server may still finish the request and log it; check the audit panel before asking again.",
        );
      }
      if (controller.signal.aborted) throw new ApiError("cancelled", "Request cancelled.");
      throw new ApiError("unreachable", "Can't reach the app's server. Check your connection and that the frontend is running.");
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }

    if (!response.ok) throw errorFromResponse(response.status, json);
    if (json === undefined) throw new ApiError("bad_response", "The backend replied with something that wasn't JSON.");
    return parse(json);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export function fetchUsers(options?: RequestOptions) {
  return request("/api/users", { method: "GET" }, parseUsers, { timeoutMs: 20_000, ...options });
}

export function askQuestion(body: AskRequest, options?: RequestOptions) {
  return request(
    "/api/ask",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
    parseAsk,
    { timeoutMs: ASK_TIMEOUT_MS, ...options },
  );
}

export function fetchAudit(options?: RequestOptions) {
  return request("/api/audit", { method: "GET" }, parseAudit, { timeoutMs: 30_000, ...options });
}

export function fetchHealth(options?: RequestOptions) {
  return request("/api/health", { method: "GET" }, parseHealth, { timeoutMs: 8_000, ...options });
}

// ---------- Break-glass reveal ----------
const STATUSES = new Set(["pending", "approved", "denied", "revealed", "expired"]);

function parseRevealRow(item: unknown): RevealRequestRow {
  if (
    !isRecord(item) ||
    typeof item.id !== "number" ||
    typeof item.answer_id !== "number" ||
    typeof item.token !== "string" ||
    typeof item.requester !== "string" ||
    typeof item.status !== "string" ||
    !STATUSES.has(item.status)
  ) {
    return bad("reveal list");
  }
  return {
    id: item.id,
    answer_id: item.answer_id,
    token: item.token,
    requester: item.requester,
    reason: typeof item.reason === "string" ? item.reason : "",
    status: item.status as RevealRequestRow["status"],
    approver: typeof item.approver === "string" ? item.approver : null,
    created_at: typeof item.created_at === "string" ? item.created_at : null,
    decided_at: typeof item.decided_at === "string" ? item.decided_at : null,
  };
}

function parseRevealListing(value: unknown): RevealListing {
  if (!isRecord(value) || !Array.isArray(value.mine) || !Array.isArray(value.to_decide)) return bad("reveal list");
  return {
    can_request: value.can_request === true,
    can_approve: value.can_approve === true,
    mine: value.mine.map(parseRevealRow),
    to_decide: value.to_decide.map(parseRevealRow),
  };
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export function listReveals(username: string, options?: RequestOptions) {
  return request("/api/reveal/list", post({ username }), parseRevealListing, { timeoutMs: 20_000, ...options });
}

export function requestReveal(body: { username: string; answer_id: number; token: string; reason: string }) {
  return request(
    "/api/reveal/request",
    post(body),
    (v) => (isRecord(v) && typeof v.request_id === "number" ? v.request_id : bad("reveal request")),
    { timeoutMs: 20_000 },
  );
}

export function decideReveal(body: { username: string; request_id: number; approve: boolean }) {
  return request(
    "/api/reveal/decide",
    post(body),
    (v) => (isRecord(v) && typeof v.status === "string" ? v.status : bad("reveal decision")),
    { timeoutMs: 20_000 },
  );
}

export function fetchRevealValue(body: { username: string; request_id: number }) {
  return request(
    "/api/reveal/value",
    post(body),
    (v) => (isRecord(v) && typeof v.value === "string" ? v.value : bad("reveal value")),
    { timeoutMs: 20_000 },
  );
}
