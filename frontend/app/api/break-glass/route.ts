import { clientIp, errorResponse, forward } from "@/lib/server/proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 4_096) {
    return errorResponse(413, "Request body is too large.", "payload_too_large");
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse(400, "Request body must be JSON.", "bad_request");
  }

  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  if (
    !record ||
    typeof record.token_id !== "string" ||
    typeof record.requested_by !== "string" ||
    typeof record.justification !== "string"
  ) {
    return errorResponse(400, "Request must include token_id, requested_by, and justification.", "bad_request");
  }

  return forward("breakGlass", {
    body: JSON.stringify({
      token_id: record.token_id,
      requested_by: record.requested_by,
      approved_by: typeof record.approved_by === "string" ? record.approved_by : "compliance1",
      justification: record.justification,
    }),
    clientIp: clientIp(request),
  });
}
