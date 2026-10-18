import { errorResponse, forward, type RouteKey } from "@/lib/server/proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Only these four actions exist; anything else is a 404 and never reaches the backend. */
const ACTIONS: Record<string, { key: RouteKey; fields: string[] }> = {
  request: { key: "revealRequest", fields: ["username", "answer_id", "token", "reason"] },
  decide: { key: "revealDecide", fields: ["username", "request_id", "approve"] },
  value: { key: "revealValue", fields: ["username", "request_id"] },
  list: { key: "revealList", fields: ["username"] },
};

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const spec = ACTIONS[action];
  if (!spec) return errorResponse(404, "Not found.", "not_found");

  const raw = await request.text();
  if (raw.length > 4_096) return errorResponse(413, "Request body is too large.", "payload_too_large");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse(400, "Request body must be JSON.", "bad_request");
  }
  if (typeof body !== "object" || body === null) return errorResponse(400, "Request body must be an object.", "bad_request");

  // Forward only the fields this action accepts.
  const record = body as Record<string, unknown>;
  const picked = Object.fromEntries(spec.fields.filter((f) => f in record).map((f) => [f, record[f]]));
  return forward(spec.key, { body: JSON.stringify(picked) });
}
