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
  masked_in_context: Record<string, number>;
  sources: SourceChunk[];
}

export interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  /** Possibly truncated string. Not guaranteed to be valid JSON. */
  details: string;
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
