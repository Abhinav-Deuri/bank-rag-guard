import type { AuditEntry } from "@/lib/api/types";

export type AuditKind = "question" | "answer" | "blocked" | "learned" | "unmask" | "action" | "other";

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
  break_glass_requested: "unmask",
  break_glass_unmasked: "unmask",
  break_glass_denied: "blocked",
  agent_action_executed: "action",
  agent_action_blocked: "blocked",
  mosaic_risk_alert: "learned",
};

const LABEL: Record<AuditKind, string> = {
  question: "Question received",
  answer: "Answer returned",
  blocked: "Blocked",
  learned: "Guard learned an attack",
  unmask: "Break-Glass Unmasked (Dual-Custody)",
  action: "Sandbox Action Executed",
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

function describe(action: string, kind: AuditKind, details: string): string {
  let d: unknown;
  try {
    d = JSON.parse(details);
  } catch {
    // The backend cuts details at 500 characters, which can leave invalid JSON.
    return "Details too long to show here.";
  }
  if (!isRecord(d)) return "";

  if (action === "break_glass_unmasked" || action === "break_glass_requested" || action === "break_glass_denied") {
    const tok = typeof d.token_id === "string" ? d.token_id : "Token";
    const reqBy = typeof d.requested_by === "string" ? `req: ${d.requested_by}` : "";
    const appBy = typeof d.approved_by === "string" ? `co-signer: ${d.approved_by}` : "";
    const rsn = typeof d.reason === "string" ? clip(d.reason, 75) : "";
    const just = typeof d.justification === "string" ? `“${clip(d.justification, 65)}”` : "";
    return [tok, reqBy, appBy, rsn || just].filter(Boolean).join(" · ");
  }
  if (action === "agent_action_executed" || action === "agent_action_blocked") {
    const actType = typeof d.action_type === "string" ? d.action_type : "Action";
    const target = typeof d.target_token === "string" ? d.target_token : "";
    const rec = typeof d.receipt === "string" ? d.receipt : "";
    const rsn = typeof d.reason === "string" ? clip(d.reason, 80) : "";
    return [actType, target, rec, rsn].filter(Boolean).join(" · ");
  }
  if (action === "mosaic_risk_alert") {
    const score = typeof d.risk_score === "number" ? `Risk ${d.risk_score}%` : "";
    const ents = typeof d.entities_tracked === "number" ? `${d.entities_tracked} entities linked` : "";
    return [score, ents].filter(Boolean).join(" · ");
  }
  if (kind === "question") {
    const tier = typeof d.tier === "number" ? `Tier ${d.tier}` : "";
    const q = typeof d.question === "string" ? `“${clip(d.question)}”` : "";
    return [tier, q].filter(Boolean).join(": ");
  }
  if (kind === "blocked") {
    const reason = typeof d.reason === "string" ? d.reason : "";
    return reason ? clip(reason.charAt(0).toUpperCase() + reason.slice(1), 110) : "Stopped by the input guard";
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
    label:
      entry.action === "agent_action_blocked"
        ? "Sandbox Blocked Action"
        : entry.action === "break_glass_denied"
          ? "Break-Glass Denied (Single-Custody)"
          : entry.action === "mosaic_risk_alert"
            ? "Mosaic Risk Alert"
            : LABEL[kind] || entry.action.replace(/_/g, " "),
    detail: describe(entry.action, kind, entry.details),
    time: formatTime(entry.ts),
    hash: entry.hash ?? null,
    prevHash: entry.prevHash ?? null,
  };
}
