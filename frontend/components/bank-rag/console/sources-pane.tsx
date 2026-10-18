"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ProximityGlow } from "@/components/bank-rag/landing/proximity-glow";
import { Redacted } from "./redacted";
import type { VaultToken } from "@/lib/api/types";
import type { Turn } from "./thread";

/** Readable name for the backend's `source` field ("cuad/…", "enron_email/…", "synthetic_customer_notes"). */
function kindOf(source: string) {
  const s = source.toLowerCase();
  if (s.startsWith("cuad")) return "contract";
  if (s.startsWith("enron")) return "email";
  if (s.includes("customer")) return "customer note";
  return source;
}

export function SourcesPane({
  turn,
  cite,
  onCite,
  maxTier,
  unmaskedMap,
  onSelectToken,
}: {
  turn: Turn | null;
  cite: number | null;
  onCite: (n: number) => void;
  maxTier: number;
  unmaskedMap?: Record<string, string>;
  onSelectToken?: (token: VaultToken) => void;
}) {
  const r = turn?.status === "done" ? turn.response : undefined;
  const sources = r?.sources ?? [];
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (cite) refs.current[cite - 1]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [cite, turn?.key]);

  const locked = turn ? Array.from({ length: maxTier - turn.tier }, (_, i) => turn.tier + i + 1) : [];
  let empty: string | null = null;
  if (!turn) empty = "Sources appear here after you ask.";
  else if (turn.status === "pending") empty = null;
  else if (turn.status === "error") empty = "No answer came back, so there are no sources to show.";
  else if (r?.blocked) empty = "Nothing was searched for this question.";
  else if (!sources.length) empty = "No documents at this clearance matched, so the model read nothing.";

  return (
    <section aria-labelledby="sources-h" className="border-b border-line px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="sources-h" className="text-[15px] font-medium tracking-normal">
          Sources
        </h2>
        {turn && (
          <span className="num truncate text-xs text-faint" dir="auto">
            for “{turn.question.length > 42 ? `${turn.question.slice(0, 41)}…` : turn.question}”
          </span>
        )}
      </div>

      {empty && <p className="mt-2.5 text-sm text-dim">{empty}</p>}

      {turn?.status === "pending" && (
        <div className="mt-3.5 space-y-3" role="status" aria-label="Loading candidate passages">
          <div className="flex items-center gap-2 text-xs text-accent">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            <span className="font-medium text-dim">Retrieving & screening passages at Tier {turn.tier}…</span>
          </div>

          {[1, 2].map((idx) => (
            <div key={idx} className="rounded-lg border border-line-soft/80 bg-raised/30 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs">
                <div className="skeleton-shimmer h-3.5 w-6 rounded" />
                <div className="skeleton-shimmer h-3.5 w-16 rounded" />
                <div className="skeleton-shimmer h-3.5 w-20 rounded" />
                <div className="skeleton-shimmer h-3.5 w-24 rounded ms-auto bg-accent/20" />
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="skeleton-shimmer h-3 w-full rounded" />
                <div className="flex items-center gap-2">
                  <div className="skeleton-shimmer h-3 w-1/3 rounded" />
                  <div className="skeleton-shimmer h-3 w-20 rounded bg-accent/30" />
                  <div className="skeleton-shimmer h-3 flex-1 rounded" />
                </div>
                <div className="skeleton-shimmer h-3 w-4/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <ol className="mt-3.5 space-y-3">
          {sources.map((s, i) => {
            const on = cite === i + 1;
            const sTokens = s.vault_tokens?.length ? s.vault_tokens : r?.vault_tokens;
            return (
              <li
                key={`${s.id}-${i}`}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                className="w-full"
              >
                <ProximityGlow
                  range={40}
                  className={cn(
                    "border-line-soft! transition-all duration-150",
                    on && "ring-1 ring-accent/70 shadow-[0_0_20px_rgba(56,189,248,0.15)]",
                  )}
                  edgeSensitivity={25}
                  glowColor="215 85 72"
                  backgroundColor="var(--ink-850)"
                  borderRadius={16}
                  glowRadius={44}
                  glowIntensity={1.0}
                  coneSpread={25}
                  animated={false}
                  colors={["#1e3fd8", "#38bdf8", "#a5d8ff"]}
                >
                  <div
                    onClick={() => onCite(i + 1)}
                    className={cn(
                      "w-full cursor-pointer p-3.5 transition-colors",
                      on ? "bg-raised/70" : "hover:bg-raised/40",
                    )}
                  >
                    <div className="num flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-start font-ledger text-xs text-faint">
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full text-[11px] font-semibold",
                          on ? "bg-accent text-bg" : "bg-inset text-fg",
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="text-dim font-mono">#{s.id}</span>
                      <span className="capitalize">{kindOf(s.source)}</span>
                      <span className="rounded bg-inset px-1.5 py-0.5 text-[11px] text-faint">
                        Tier {s.tier}
                      </span>
                      <span className="ms-auto text-dim" title="Similarity match score">
                        match {s.score.toFixed(3)}
                      </span>
                    </div>
                    <Redacted
                      text={s.text}
                      className="mt-2 font-doc text-[13.5px] leading-[1.65] text-dim"
                      vaultTokens={sTokens}
                      unmaskedMap={unmaskedMap}
                      onSelectToken={onSelectToken}
                    />
                  </div>
                </ProximityGlow>
              </li>
            );
          })}
        </ol>
      )}

      {r && !r.blocked && (r.dropped_passages ?? 0) > 0 && (
        <p className="mt-3 text-[13px] text-dim">
          <span className="font-medium text-warn">
            {r.dropped_passages} {r.dropped_passages === 1 ? "passage" : "passages"} withheld.
          </span>{" "}
          The passage screen found instructions aimed at the assistant and removed{" "}
          {r.dropped_passages === 1 ? "it" : "them"} before the model read anything.
        </p>
      )}
      {r && !r.blocked && locked.length > 0 && (
        <p className="mt-2 text-[13px] text-faint">
          {locked.length === 1 ? `Tier ${locked[0]} was` : `Tiers ${locked.join(" and ")} were`} not searched for{" "}
          {turn?.username}.
        </p>
      )}

      {r?.mosaic && (
        <div className="mt-4 rounded-xl border border-line-soft bg-surface/50 p-3.5 text-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                Pivot 1 · Stateful k-Anonymity Tracker
              </span>
              <div className="font-medium text-fg">Session Mosaic Attack Graph ({r.mosaic.username})</div>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold uppercase",
                r.mosaic.level === "critical"
                  ? "bg-bad/20 text-bad"
                  : r.mosaic.level === "elevated"
                    ? "bg-warn/20 text-warn"
                    : "bg-ok/15 text-ok",
              )}
            >
              {r.mosaic.risk_score}% · {r.mosaic.level}
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-inset">
            <div
              className={cn(
                "h-full transition-all duration-300",
                r.mosaic.level === "critical"
                  ? "bg-bad"
                  : r.mosaic.level === "elevated"
                    ? "bg-warn"
                    : "bg-ok",
              )}
              style={{ width: `${Math.min(100, Math.max(4, r.mosaic.risk_score))}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-dim">
            <div className="rounded border border-line-soft/60 bg-bg/60 px-2 py-1">
              <span className="text-faint block text-[10px]">Turns</span>
              <span className="text-fg font-semibold">{r.mosaic.turns_in_window}</span>
            </div>
            <div className="rounded border border-line-soft/60 bg-bg/60 px-2 py-1">
              <span className="text-faint block text-[10px]">Entities</span>
              <span className="text-fg font-semibold">{r.mosaic.entities_tracked}</span>
            </div>
            <div className="rounded border border-line-soft/60 bg-bg/60 px-2 py-1">
              <span className="text-faint block text-[10px]">Chunks</span>
              <span className="text-fg font-semibold">{r.mosaic.sources_touched}</span>
            </div>
          </div>

          {r.mosaic.nodes.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {r.mosaic.nodes.map((node) => (
                <span
                  key={node}
                  className="rounded border border-line-soft bg-bg px-1.5 py-0.5 font-mono text-[10px] text-dim"
                >
                  {node}
                </span>
              ))}
            </div>
          )}

          {r.mosaic.advisory && <p className="text-[11.5px] leading-snug text-dim">{r.mosaic.advisory}</p>}
        </div>
      )}
    </section>
  );
}
