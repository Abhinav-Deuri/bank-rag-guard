import type { AuditEntry } from "@/lib/api/types";

export type AuditKind = "question" | "answer" | "blocked" | "learned" | "reveal" | "unmask" | "action" | "other";

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
  unmask_requested: "reveal",
  unmask_approved: "reveal",
  unmask_denied: "reveal",
  unmask_revealed: "reveal",
  break_glass_requested: "unmask",
  break_glass_unmasked: "unmask",
  break_glass_denied: "blocked",
  agent_action_executed: "action",
  agent_action_blocked: "blocked",
  mosaic_risk_alert: "learned",
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
  learned: "Guard learned an attack",
  reveal: "",
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
    return clip(details, 80);
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
    return [tier, q].filter(Boolean).join(" · ");
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
  if (kind === "learned") {
    const goal = typeof d.goal === "string" ? d.goal : "";
    const source = typeof d.source === "string" ? d.source : "";
    const ref = typeof d.example_id === "number" ? `#${d.example_id}` : "";
    return [ref, goal ? `“${clip(goal, 60)}”` : "", source].filter(Boolean).join(" · ");
  }
  if (kind === "answer") {
    const dropped = typeof d.dropped_passages === "number" ? d.dropped_passages : 0;
    const inMasked = sumCounts(d.masked_in_context);
    const outMasked = sumCounts(d.masked_in_answer);
    const nSources = Array.isArray(d.chunk_ids) ? d.chunk_ids.length : 0;
    const parts = [plural(nSources, "source")];
    if (inMasked) parts.push(`${inMasked} in context masked`);
    if (outMasked) parts.push(`${outMasked} in answer masked`);
    if (dropped) parts.push(`${plural(dropped, "passage")} dropped`);
    return parts.join(", ");
  }
  return clip(details, 80);
}

function formatTime(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
            : REVEAL_LABEL[entry.action] || LABEL[kind] || entry.action.replace(/_/g, " "),
    detail: describe(entry.action, kind, entry.details),
    time: formatTime(entry.ts),
    hash: entry.hash ?? null,
    prevHash: entry.prevHash ?? null,
  };
}
