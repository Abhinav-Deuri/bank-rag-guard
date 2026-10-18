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
  if (!record || typeof record.action_id !== "number" || typeof record.username !== "string") {
    return errorResponse(400, "Request must include action_id and username.", "bad_request");
  }

  return forward("executeAction", {
    body: JSON.stringify({
      action_id: record.action_id,
      username: record.username,
    }),
    clientIp: clientIp(request),
  });
}
