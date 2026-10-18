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

export interface VaultToken {
  index: number;
  token_id: string;
  label: string;
}

export interface ProposedAction {
  id: number;
  action_type: string;
  title: string;
  description: string;
  target_token: string;
  proposed_by: string;
  user_tier: number;
  required_tier: number;
  provenance_ok: boolean;
  status: "sandboxed" | "executed" | "blocked_provenance" | "blocked_tier" | string;
  reason?: string;
  system?: string;
  executed_by?: string;
  receipt?: string;
  audit_hash?: string;
}

export interface MosaicState {
  username: string;
  risk_score: number;
  level: "safe" | "elevated" | "critical" | string;
  turns_in_window: number;
  entities_tracked: number;
  sources_touched: number;
  nodes: string[];
  advisory?: string;
}

export interface SourceChunk {
  id: number;
  source: string;
  tier: number;
  /** Retrieval similarity (cosine), not answer confidence. */
  score: number;
  /** Masked excerpt, truncated to 300 characters by the backend. */
  text: string;
  vault_tokens?: VaultToken[];
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
  /** The input guard's short explanation, when the question was blocked. */
  reason?: string | null;
  sources: SourceChunk[];
  vault_tokens?: VaultToken[];
  answer_tokens?: VaultToken[];
  proposed_actions?: ProposedAction[];
  mosaic?: MosaicState | null;
}

export interface BreakGlassApproveRequest {
  token_id: string;
  requested_by: string;
  approved_by: string;
  justification: string;
}

export interface BreakGlassApproveResponse {
  request_id: number;
  token_id: string;
  label: string;
  plaintext: string;
  requested_by: string;
  approved_by: string;
  justification: string;
  status: string;
  audit_entry_id?: number;
  audit_hash?: string;
  hsm_key_id?: string;
}

export interface FactSheetControl {
  framework: string;
  control_id: string;
  requirement: string;
  mechanism: string;
  status: string;
  evidence: string;
}

export interface FactSheetResponse {
  factsheet_id: string;
  generated_at: string;
  platform: string;
  chain_verified: boolean;
  chain_message: string;
  chain_head_hash: string;
  pqc_signature: string;
  metrics: Record<string, number>;
  controls: FactSheetControl[];
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
