/** Shapes returned by the existing FastAPI backend (app.py is the source of truth). */

export interface DemoUser {
  username: string;
  role: string;
  tier: number;
}

export interface AskRequest {
  username: string;
  question: string;
}

export interface SourceChunk {
  id: number;
  source: string;
  tier: number;
  /** Retrieval similarity (cosine), not answer confidence. */
  score: number;
  /** Masked excerpt, truncated to 300 characters by the backend. */
  text: string;
}

export interface AskResponse {
  username: string;
  tier: number;
  blocked: boolean;
  answer: string;
  dropped_passages?: number;
  masked_in_context: Record<string, number>;
  masked_in_answer?: Record<string, number>;
  learned_attacks_count?: number;
  /** Audit-log id of this answer; needed to request a break-glass reveal. */
  answer_id?: number | null;
  /** Distinct customers' records in this user's answers over the last hour, and the alert limit. */
  mosaic?: MosaicStatus | null;
  /** The input guard's short explanation, when the question was blocked. */
  reason?: string | null;
  sources: SourceChunk[];
}

export interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  /** Possibly truncated string. Not guaranteed to be valid JSON. */
  details: string;
  /** ISO timestamp, when the backend sends it. */
  ts?: string;
  /** This entry's SHA-256 fingerprint and the previous entry's, when the backend sends them. */
  hash?: string;
  prevHash?: string;
}

export interface AuditResponse {
  ok: boolean;
  message: string;
  /** Latest 12 entries only. Verification covers the whole chain. */
  entries: AuditEntry[];
}

export interface HealthResponse {
  status: string;
}

export const MAX_QUESTION_LENGTH = 500;

/** Break-glass reveal (backend src/vault.py). Values never appear in these shapes. */
export type RevealStatus = "pending" | "approved" | "denied" | "revealed" | "expired";

export interface RevealRequestRow {
  id: number;
  answer_id: number;
  token: string;
  requester: string;
  reason: string;
  status: RevealStatus;
  approver: string | null;
  created_at: string | null;
  decided_at: string | null;
}

export interface RevealListing {
  can_request: boolean;
  can_approve: boolean;
  mine: RevealRequestRow[];
  to_decide: RevealRequestRow[];
}

export interface MosaicStatus {
  customers_last_hour: number;
  limit: number;
  alert: boolean;
}
