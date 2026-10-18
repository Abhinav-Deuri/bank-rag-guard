import type { AuditEntry } from "@/lib/api/types";

export type AuditKind = "question" | "answer" | "blocked" | "alert" | "learned" | "reveal" | "other";

export interface AuditRow {
  id: number;
  actor: string;
  kind: AuditKind;
  label: string;
  /** Plain-language summary. May contain mask tags such as [NAME], rendered as redaction bars. */
  detail: string;
  time: string | null;
  hash: string | null;
  prevHash: string | null;
}

const KIND: Record<string, AuditKind> = {
  question_received: "question",
  answer_returned: "answer",
  question_blocked: "blocked",
  guard_example_added: "learned",
  mosaic_alert: "alert",
  unmask_requested: "reveal",
  unmask_approved: "reveal",
  unmask_denied: "reveal",
  unmask_revealed: "reveal",
};

const REVEAL_LABEL: Record<string, string> = {
  unmask_requested: "Reveal requested",
  unmask_approved: "Reveal approved",
  unmask_denied: "Reveal denied",
  unmask_revealed: "Value shown once",
};

const LABEL: Record<AuditKind, string> = {
  question: "Question received",
  answer: "Answer returned",
  blocked: "Blocked",
  alert: "Many customers in an hour",
  learned: "Guard learned an attack",
  reveal: "",
  other: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sumCounts(value: unknown): number {
  if (!isRecord(value)) return 0;
  return Object.values(value).reduce<number>((n, v) => n + (typeof v === "number" ? v : 0), 0);
}

function clip(text: string, max = 90) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function describe(kind: AuditKind, details: string): string {
  let d: unknown;
  try {
    d = JSON.parse(details);
  } catch {
    // The backend cuts details at 500 characters, which can leave invalid JSON.
    return "Details too long to show here.";
  }
  if (!isRecord(d)) return "";

  if (kind === "question") {
    const tier = typeof d.tier === "number" ? `Tier ${d.tier}` : "";
    const q = typeof d.question === "string" ? `“${clip(d.question)}”` : "";
    return [tier, q].filter(Boolean).join(": ");
  }
  if (kind === "blocked") {
    const reason = typeof d.reason === "string" ? d.reason : "";
    return reason ? clip(reason.charAt(0).toUpperCase() + reason.slice(1), 110) : "Stopped by the input guard";
  }
  if (kind === "reveal") {
    const token = typeof d.token === "string" ? d.token.replace(/_/g, " ") : "";
    const ref = typeof d.request_id === "number" ? `request #${d.request_id}` : "";
    const answer = typeof d.answer_id === "number" ? `answer #${d.answer_id}` : "";
    const who = typeof d.requester === "string" ? `for ${d.requester}` : typeof d.approver === "string" ? `approved by ${d.approver}` : "";
    const why = typeof d.reason === "string" ? `“${clip(d.reason, 70)}”` : "";
    return [token, ref, answer, who, why].filter(Boolean).join(", ");
  }
  if (kind === "alert") {
    const n = typeof d.customers_last_hour === "number" ? d.customers_last_hour : null;
    const lim = typeof d.limit === "number" ? d.limit : null;
    return n !== null ? `${plural(n, "different customer")} in answers within an hour${lim ? ` (limit ${lim})` : ""}` : "";
  }
  if (kind === "learned") {
    const goal = typeof d.goal === "string" ? d.goal : "";
    const source = typeof d.source === "string" ? d.source : "";
    return [goal && `Goal: ${goal}`, source].filter(Boolean).join(", ");
  }
  if (kind === "answer") {
    const parts: string[] = [];
    const ids = Array.isArray(d.chunk_ids) ? d.chunk_ids.length : null;
    if (ids !== null) parts.push(ids ? plural(ids, "passage") : "No passages at this clearance");
    const tiers = Array.isArray(d.chunk_tiers)
      ? [...new Set(d.chunk_tiers.filter((t): t is number => typeof t === "number"))].sort()
      : [];
    if (tiers.length) parts.push(`${tiers.length === 1 ? "tier" : "tiers"} ${tiers.join(", ")}`);
    const dropped = typeof d.dropped_passages === "number" ? d.dropped_passages : 0;
    if (dropped) parts.push(`${dropped} withheld`);
    const removed = sumCounts(d.masked_in_context);
    if (removed) parts.push(plural(removed, "detail") + " removed");
    const caught = sumCounts(d.masked_in_answer);
    if (caught) parts.push(`${caught} caught in the answer`);
    return parts.join(", ");
  }
  return "";
}

function formatTime(ts: string | undefined): string | null {
  if (!ts) return null;
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function toAuditRow(entry: AuditEntry): AuditRow {
  const kind = KIND[entry.action] ?? "other";
  return {
    id: entry.id,
    actor: entry.actor,
    kind,
    label: REVEAL_LABEL[entry.action] || LABEL[kind] || entry.action.replace(/_/g, " "),
    detail: describe(kind, entry.details),
    time: formatTime(entry.ts),
    hash: entry.hash ?? null,
    prevHash: entry.prevHash ?? null,
  };
}
