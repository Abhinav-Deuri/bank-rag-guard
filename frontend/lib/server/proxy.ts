import "server-only";
import { NextResponse } from "next/server";

/**
 * Same-origin proxy to the FastAPI backend.
 *
 * Only the fixed upstream paths below are reachable. The browser never supplies a
 * URL, a path or headers: it can only choose one of these keys by hitting the
 * matching route handler. Secrets (database URL, Jina / Groq keys) stay in Python.
 */
const ROUTES = {
  users: { method: "GET", path: "/api/users", timeoutMs: 20_000 },
  ask: { method: "POST", path: "/api/ask", timeoutMs: 110_000 },
  audit: { method: "GET", path: "/api/audit", timeoutMs: 30_000 },
  health: { method: "GET", path: "/health", timeoutMs: 8_000 },
  breakGlass: { method: "POST", path: "/api/break-glass", timeoutMs: 20_000 },
  executeAction: { method: "POST", path: "/api/actions/execute", timeoutMs: 20_000 },
  factsheet: { method: "GET", path: "/api/factsheet", timeoutMs: 20_000 },
} as const;

export type RouteKey = keyof typeof ROUTES;

const NO_STORE = { "cache-control": "no-store, max-age=0" } as const;

function backendBase(): string | null {
  const raw = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").trim();
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function errorResponse(status: number, detail: string, code: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ detail, code, ...extra }, { status, headers: NO_STORE });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Keep only a short string or `{ loc, msg }` pairs from an upstream error. Never forward raw bodies. */
function safeDetail(body: unknown): string | Array<{ loc: Array<string | number>; msg: string }> | null {
  if (!isRecord(body)) return null;
  const detail = body.detail;
  if (typeof detail === "string") return detail.slice(0, 300);
  if (Array.isArray(detail)) {
    return detail
      .filter(isRecord)
      .slice(0, 5)
      .map((item) => ({
        loc: Array.isArray(item.loc)
          ? item.loc.filter((p): p is string | number => typeof p === "string" || typeof p === "number").slice(0, 6)
          : [],
        msg: typeof item.msg === "string" ? item.msg.slice(0, 200) : "invalid value",
      }));
  }
  return null;
}

function genericDetail(status: number): string {
  if (status === 400) return "The backend rejected this request.";
  if (status === 429) return "Request limit reached.";
  if (status >= 500) return "The backend reported an error.";
  return "The backend returned an unexpected response.";
}

/**
 * The visitor's address, from the platform's forwarding headers (Vercel and most hosts set them). Sent to the
 * backend so its rate limit applies per visitor instead of to everyone behind this proxy.
 */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim();
  return ip && ip.length <= 64 ? ip : null;
}

export async function forward(key: RouteKey, init?: { body?: string; clientIp?: string | null }): Promise<NextResponse> {
  const route = ROUTES[key];
  const base = backendBase();
  if (!base) {
    return errorResponse(502, "BACKEND_URL is not a valid http(s) address.", "upstream_misconfigured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), route.timeoutMs);

  try {
    const upstream = await fetch(base + route.path, {
      method: route.method,
      headers: {
        accept: "application/json",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(init?.clientIp ? { "x-client-ip": init.clientIp } : {}),
        // Lets a backend on another machine trust x-client-ip. Same value as the backend's PROXY_SHARED_SECRET.
        ...(process.env.PROXY_SHARED_SECRET ? { "x-proxy-secret": process.env.PROXY_SHARED_SECRET } : {}),
      },
      body: init?.body,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });

    const text = await upstream.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }

    if (upstream.ok) {
      if (json === undefined) {
        return errorResponse(502, "The backend returned a response that wasn't JSON.", "bad_upstream_response");
      }
      return NextResponse.json(json, { status: upstream.status, headers: NO_STORE });
    }

    // Preserve the upstream status code, but never forward stack traces or raw bodies.
    const detail = safeDetail(json);
    return NextResponse.json(
      { detail: detail ?? genericDetail(upstream.status), code: "upstream_error" },
      { status: upstream.status, headers: NO_STORE },
    );
  } catch (error) {
    if (controller.signal.aborted) {
      return errorResponse(504, "The backend did not answer in time.", "upstream_timeout");
    }
    const reason = error instanceof Error ? error.name : "error";
    return errorResponse(502, "The backend could not be reached.", "upstream_unreachable", { reason });
  } finally {
    clearTimeout(timer);
  }
}
