import { errorResponse, forward } from "@/lib/server/proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Model calls are slow; give the platform room (Vercel honours this, Node ignores it). */
export const maxDuration = 120;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 8_192) {
    return errorResponse(413, "Request body is too large.", "payload_too_large");
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse(400, "Request body must be JSON.", "bad_request");
  }

  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  if (!record || typeof record.username !== "string" || typeof record.question !== "string") {
    return errorResponse(400, "Request must include a username and a question.", "bad_request");
  }

  // Forward only the two fields the backend accepts. The 500-character rule is the backend's to enforce.
  return forward("ask", {
    body: JSON.stringify({ username: record.username, question: record.question }),
  });
}
