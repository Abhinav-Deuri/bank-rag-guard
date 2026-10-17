"use client";

import { LoaderCircle, Wifi, WifiOff } from "lucide-react";
import type { HealthState } from "@/hooks/use-health";
import { cn } from "@/lib/utils";

/**
 * GET /health only proves the API process answers. The wording says "responding",
 * never "healthy", and the title spells out what is not checked. On phones the pill
 * shrinks to its icon; the text stays available to screen readers.
 */
export function ConnectionStatus({ health, onRecheck }: { health: HealthState; onRecheck: () => void }) {
  const base = "inline-flex h-9 items-center gap-2 rounded-full border px-2.5 text-sm lg:px-3";
  const label = "sr-only lg:not-sr-only";

  if (health.status === "checking") {
    return (
      <div role="status" className={cn(base, "border-line text-dim")}>
        <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        <span className={label}>Checking backend…</span>
      </div>
    );
  }

  if (health.status === "up") {
    return (
      <div
        role="status"
        title="The health check confirms the API process answers. It does not test the database or the Jina and Groq services."
        className={cn(base, "border-ok/40 bg-ok/10 text-ok")}
      >
        <Wifi className="size-4" aria-hidden />
        <span className={label}>Backend responding</span>
      </div>
    );
  }

  return (
    <div role="status" className={cn(base, "gap-2.5 border-bad/45 bg-bad/10 pr-1.5 text-bad")}>
      <WifiOff className="size-4" aria-hidden />
      <span className={label}>Backend not connected</span>
      <button
        type="button"
        onClick={onRecheck}
        className="rounded-full border border-bad/40 px-2.5 py-0.5 text-xs font-medium text-fg transition-colors hover:bg-bad/20"
      >
        Retry
      </button>
    </div>
  );
}
