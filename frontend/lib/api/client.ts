import { ApiError, errorFromResponse } from "./errors";
import type {
  AskRequest,
  AskResponse,
  AuditEntry,
  AuditResponse,
  BreakGlassApproveRequest,
  BreakGlassApproveResponse,
  DemoUser,
  FactSheetResponse,
  HealthResponse,
  MosaicState,
  ProposedAction,
  RevealListing,
  RevealRequestRow,
  SourceChunk,
  VaultToken,
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

function parseVaultTokens(value: unknown): VaultToken[] {
  if (!Array.isArray(value)) return [];
  const out: VaultToken[] = [];
  value.forEach((item, i) => {
    if (isRecord(item) && typeof item.token_id === "string" && typeof item.label === "string") {
      out.push({
        index: typeof item.index === "number" ? item.index : i,
        token_id: item.token_id,
        label: item.label,
      });
    }
  });
  return out;
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
  return {
    id: item.id,
    source: item.source,
    tier: item.tier,
    score: item.score,
    text: item.text,
    vault_tokens: parseVaultTokens(item.vault_tokens),
  };
}

function parseProposedActions(value: unknown): ProposedAction[] {
  if (!Array.isArray(value)) return [];
  const out: ProposedAction[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "number" || typeof item.action_type !== "string") continue;
    out.push({
      id: item.id,
      action_type: item.action_type,
      title: typeof item.title === "string" ? item.title : item.action_type,
      description: typeof item.description === "string" ? item.description : "",
      target_token: typeof item.target_token === "string" ? item.target_token : "RECORD",
      proposed_by: typeof item.proposed_by === "string" ? item.proposed_by : "",
      user_tier: typeof item.user_tier === "number" ? item.user_tier : 1,
      required_tier: typeof item.required_tier === "number" ? item.required_tier : 2,
      provenance_ok: item.provenance_ok !== false,
      status: typeof item.status === "string" ? item.status : "sandboxed",
      reason: typeof item.reason === "string" ? item.reason : undefined,
      system: typeof item.system === "string" ? item.system : undefined,
      executed_by: typeof item.executed_by === "string" ? item.executed_by : undefined,
      receipt: typeof item.receipt === "string" ? item.receipt : undefined,
      audit_hash: typeof item.audit_hash === "string" ? item.audit_hash : undefined,
    });
  }
  return out;
}

function parseMosaic(value: unknown): MosaicState | null {
  if (!isRecord(value) || typeof value.risk_score !== "number") return null;
  return {
    username: typeof value.username === "string" ? value.username : "",
    risk_score: value.risk_score,
    level: typeof value.level === "string" ? value.level : "safe",
    turns_in_window: typeof value.turns_in_window === "number" ? value.turns_in_window : 1,
    entities_tracked: typeof value.entities_tracked === "number" ? value.entities_tracked : 0,
    sources_touched: typeof value.sources_touched === "number" ? value.sources_touched : 0,
    nodes: Array.isArray(value.nodes) ? value.nodes.filter((n): n is string => typeof n === "string") : [],
    advisory: typeof value.advisory === "string" ? value.advisory : undefined,
  };
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
    vault_tokens: parseVaultTokens(value.vault_tokens),
    answer_tokens: parseVaultTokens(value.answer_tokens),
    proposed_actions: parseProposedActions(value.proposed_actions),
    mosaic: parseMosaic(value.mosaic),
  };
}

function parseBreakGlass(value: unknown): BreakGlassApproveResponse {
  if (!isRecord(value) || typeof value.token_id !== "string" || typeof value.plaintext !== "string") {
    return bad("break-glass");
  }
  return {
    request_id: typeof value.request_id === "number" ? value.request_id : 0,
    token_id: value.token_id,
    label: typeof value.label === "string" ? value.label : "PII",
    plaintext: value.plaintext,
    requested_by: typeof value.requested_by === "string" ? value.requested_by : "",
    approved_by: typeof value.approved_by === "string" ? value.approved_by : "",
    justification: typeof value.justification === "string" ? value.justification : "",
    status: typeof value.status === "string" ? value.status : "approved",
    audit_entry_id: typeof value.audit_entry_id === "number" ? value.audit_entry_id : undefined,
    audit_hash: typeof value.audit_hash === "string" ? value.audit_hash : undefined,
    hsm_key_id: typeof value.hsm_key_id === "string" ? value.hsm_key_id : undefined,
  };
}

function parseActionExecute(value: unknown): ProposedAction {
  const list = parseProposedActions([value]);
  if (!list.length) return bad("action execution");
  return list[0];
}

function parseFactSheet(value: unknown): FactSheetResponse {
  if (!isRecord(value) || typeof value.factsheet_id !== "string" || !Array.isArray(value.controls)) {
    return bad("factsheet");
  }
  const metrics: Record<string, number> = {};
  if (isRecord(value.metrics)) {
    for (const [k, v] of Object.entries(value.metrics)) {
      if (typeof v === "number") metrics[k] = v;
    }
  }
  return {
    factsheet_id: value.factsheet_id,
    generated_at: typeof value.generated_at === "string" ? value.generated_at : "",
    platform: typeof value.platform === "string" ? value.platform : "",
    chain_verified: value.chain_verified === true,
    chain_message: typeof value.chain_message === "string" ? value.chain_message : "",
    chain_head_hash: typeof value.chain_head_hash === "string" ? value.chain_head_hash : "",
    pqc_signature: typeof value.pqc_signature === "string" ? value.pqc_signature : "",
    metrics,
    controls: value.controls.filter(isRecord).map((c) => ({
      framework: String(c.framework ?? ""),
      control_id: String(c.control_id ?? ""),
      requirement: String(c.requirement ?? ""),
      mechanism: String(c.mechanism ?? ""),
      status: String(c.status ?? ""),
      evidence: String(c.evidence ?? ""),
    })),
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

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export function fetchUsers(options?: RequestOptions) {
  return request("/api/users", { method: "GET" }, parseUsers, { timeoutMs: 20_000, ...options });
}

export function askQuestion(body: AskRequest, options?: RequestOptions) {
  return request(
    "/api/ask",
    post(body),
    parseAsk,
    { timeoutMs: ASK_TIMEOUT_MS, ...options },
  );
}

export function approveBreakGlass(body: BreakGlassApproveRequest, options?: RequestOptions) {
  return request(
    "/api/break-glass",
    post(body),
    parseBreakGlass,
    { timeoutMs: 20_000, ...options },
  );
}

export function executeSandboxAction(body: { action_id: number; username: string }, options?: RequestOptions) {
  return request(
    "/api/actions/execute",
    post(body),
    parseActionExecute,
    { timeoutMs: 20_000, ...options },
  );
}

export function fetchFactSheet(options?: RequestOptions) {
  return request("/api/factsheet", { method: "GET" }, parseFactSheet, { timeoutMs: 20_000, ...options });
}

export function fetchAudit(options?: RequestOptions) {
  return request("/api/audit", { method: "GET" }, parseAudit, { timeoutMs: 30_000, ...options });
}

export function fetchHealth(options?: RequestOptions) {
  return request("/api/health", { method: "GET" }, parseHealth, { timeoutMs: 8_000, ...options });
}

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
