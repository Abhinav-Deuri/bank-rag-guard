export type ApiErrorKind =
  | "bad_request"
  | "rate_limited"
  | "server"
  | "unreachable"
  | "timeout"
  | "bad_response"
  | "cancelled"
  | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * FastAPI sends `detail` as a string for HTTPException and as an array of
 * `{ loc, msg }` objects for validation errors. Reduce either to one short line.
 */
export function normalizeDetail(detail: unknown): string | null {
  if (typeof detail === "string") {
    const text = detail.trim().slice(0, 240);
    return text || null;
  }
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (!isRecord(item)) return null;
        const msg = typeof item.msg === "string" ? item.msg : null;
        const loc = Array.isArray(item.loc)
          ? item.loc.filter((p) => typeof p === "string" && p !== "body").join(".")
          : "";
        if (!msg) return null;
        return loc ? `${loc}: ${msg}` : msg;
      })
      .filter((p): p is string => Boolean(p))
      .slice(0, 3);
    return parts.length ? parts.join("; ").slice(0, 240) : null;
  }
  return null;
}

export function errorFromResponse(status: number, body: unknown): ApiError {
  const detail = isRecord(body) ? normalizeDetail(body.detail) : null;
  const code = isRecord(body) && typeof body.code === "string" ? body.code : null;

  if (code === "upstream_unreachable" || code === "upstream_misconfigured") {
    return new ApiError(
      "unreachable",
      "Can't reach the AEGIS-Z backend. Check that FastAPI is running and that BACKEND_URL points to it.",
      status,
    );
  }
  if (code === "upstream_timeout") {
    return new ApiError(
      "timeout",
      "The backend didn't answer in time. It may still be working on the request and may log it; check the audit panel before trying again.",
      status,
    );
  }
  if (code === "bad_upstream_response") {
    return new ApiError("bad_response", "The backend replied with something this app couldn't read.", status);
  }

  if (status === 429) {
    return new ApiError(
      "rate_limited",
      "Request limit reached. The backend allows 30 questions per minute per visitor and 400 per day across the whole demo, and it doesn't say which one applied. Wait before trying again; a short wait may not be enough if the daily limit was hit.",
      status,
    );
  }
  if (status === 400) {
    return new ApiError("bad_request", detail ?? "The backend rejected this request. Check the question and the selected user.", status);
  }
  if (status === 422) {
    return new ApiError(
      "bad_request",
      detail ? `The request wasn't in the expected format (${detail}).` : "The request wasn't in the expected format.",
      status,
    );
  }
  if (status === 503) {
    // The backend says plainly that the model or database is unavailable; show its short message.
    return new ApiError("server", detail ?? "A service the backend depends on is unavailable. Please try again in a minute.", status);
  }
  if (status >= 500) {
    return new ApiError(
      "server",
      "The server hit an error while handling this request. It may already have logged an event, so check the audit panel.",
      status,
    );
  }
  return new ApiError("unknown", detail ?? `The backend returned an unexpected status (${status}).`, status);
}
