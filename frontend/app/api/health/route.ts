import { forward } from "@/lib/server/proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return forward("health");
}
