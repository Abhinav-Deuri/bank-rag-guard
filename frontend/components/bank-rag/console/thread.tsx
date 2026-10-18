"use client";

import { useEffect, useRef } from "react";
import type { ApiError } from "@/lib/api/errors";
import type { AskResponse, VaultToken } from "@/lib/api/types";
import { useElapsed } from "@/hooks/use-elapsed";
import { ProximityGlow } from "@/components/bank-rag/landing/proximity-glow";
import { cn } from "@/lib/utils";
import { Redacted } from "./redacted";
import { ActionSandboxPanel } from "./action-sandbox";

export interface Turn {
  key: number;
  username: string;
  tier: number;
  question: string;
  askedAt: Date;
  startedAt: number;
  status: "pending" | "done" | "error";
  response?: AskResponse;
  error?: ApiError;
}

/** "attempts to reveal system prompt" -> "Attempts to reveal system prompt." */
function sentence(text: string) {
  const t = text.trim().replace(/[.\s]+$/, "");
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}.` : "";
}

function sum(counts: Record<string, number> | undefined) {
  return Object.values(counts ?? {}).reduce((a, b) => a + b, 0);
}

function removedText(n: number) {
  return n === 0 ? "nothing" : n === 1 ? "1 detail" : `${n} details`;
}

export function tierRange(tier: number) {
  return tier === 1 ? "tier 1 only" : `tiers 1–${tier}`;
}

function Pending({ turn, onStop }: { turn: Turn; onStop: () => void }) {
  const seconds = useElapsed(turn.startedAt);
  return (
    <div className="mt-4 space-y-3.5 max-w-[64ch]" role="status" aria-label="Loading answer and checking guard">
      {/* Live pipeline status bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-md border border-line-soft bg-raised/50 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 text-accent">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          <span className="font-medium text-fg">
            Screening question & searching {tierRange(turn.tier)}…
          </span>
          <span className="num font-mono text-faint">({seconds}s elapsed)</span>
        </div>
        <button
          type="button"
          onClick={onStop}
          className="text-xs text-faint underline underline-offset-4 hover:text-fg transition-colors"
        >
          Stop waiting
        </button>
      </div>

      {/* Answer Lines Skeleton with simulated inline redaction tags & citation badge */}
      <div className="space-y-2.5 rounded-lg border border-line-soft/80 bg-raised/20 p-4">
        {/* Line 1 */}
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer h-4 flex-1 rounded" />
          <div className="skeleton-shimmer h-4 w-20 rounded bg-accent/20" title="Simulated redaction" />
          <div className="skeleton-shimmer h-4 w-28 rounded" />
        </div>
        {/* Line 2 */}
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer h-4 w-36 rounded" />
          <div className="skeleton-shimmer h-4 flex-1 rounded" />
          <div className="skeleton-shimmer h-4 w-6 rounded-full bg-accent/30" title="Citation badge" />
        </div>
        {/* Line 3 */}
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer h-4 w-24 rounded bg-accent/20" />
          <div className="skeleton-shimmer h-4 flex-1 rounded" />
          <div className="skeleton-shimmer h-4 w-16 rounded" />
        </div>
        {/* Line 4 */}
        <div className="skeleton-shimmer h-4 w-3/5 rounded" />
      </div>

      {/* Safeguards / Facts Bar Skeleton */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
        <div className="skeleton-shimmer h-4 w-20 rounded" />
        <div className="skeleton-shimmer h-4 w-24 rounded" />
        <div className="skeleton-shimmer h-4 w-20 rounded" />
        <div className="skeleton-shimmer h-4 w-28 rounded" />
      </div>
    </div>
  );
}

function Facts({ turn }: { turn: Turn }) {
  const r = turn.response;
  if (!r) return null;
  const facts: { k: string; v: string; tone?: "bad" | "warn" }[] = r.blocked
    ? [
        { k: "Guard", v: "blocked", tone: "bad" },
        { k: "Searched", v: "nothing" },
      ]
    : [
        { k: "Guard", v: "passed" },
        { k: "Searched", v: tierRange(r.tier) },
        { k: "Passages", v: String(r.sources.length) },
        { k: "Withheld", v: String(r.dropped_passages ?? 0), tone: r.dropped_passages ? "warn" : undefined },
        { k: "Removed", v: removedText(sum(r.masked_in_context)) },
      ];
  const caught = sum(r.masked_in_answer);
  if (caught) facts.push({ k: "Caught in answer", v: String(caught), tone: "warn" });
  if (r.mosaic) {
    facts.push({
      k: "Mosaic graph risk",
      v: `${r.mosaic.risk_score}% (${r.mosaic.level})`,
      tone: r.mosaic.level === "critical" ? "bad" : r.mosaic.level === "elevated" ? "warn" : undefined,
    });
  }

  return (
    <dl className="mt-2.5 flex flex-wrap gap-y-1 text-[12.5px]" aria-label="What the safeguards did">
      {facts.map((f) => (
        <div key={f.k} className="me-3.5 flex gap-1.5 border-e border-line-soft pe-3.5 last:border-e-0">
          <dt className="text-faint">{f.k}</dt>
          <dd className={cn("num", f.tone === "bad" ? "text-bad" : f.tone === "warn" ? "text-warn" : "text-fg")}>{f.v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Body({
  turn,
  active,
  cite,
  onCite,
  onRetry,
  onStop,
  currentUsername,
  currentUserTier,
  unmaskedMap,
  onSelectToken,
  onActionExecuted,
}: {
  turn: Turn;
  active: boolean;
  cite: number | null;
  onCite: (n: number) => void;
  onRetry: () => void;
  onStop: () => void;
  currentUsername: string;
  currentUserTier: number;
  unmaskedMap?: Record<string, string>;
  onSelectToken?: (token: VaultToken) => void;
  onActionExecuted: () => void;
}) {
  if (turn.status === "pending") return <Pending turn={turn} onStop={onStop} />;

  if (turn.status === "error" && turn.error) {
    const retry = turn.error.kind !== "bad_request" && turn.error.kind !== "cancelled";
    return (
      <div role="alert" className="mt-3 max-w-[64ch] text-[15px]">
        <span className={cn("font-medium", turn.error.kind === "rate_limited" ? "text-warn" : "text-bad")}>
          {turn.error.kind === "rate_limited" ? "Too many questions." : turn.error.kind === "cancelled" ? "Stopped." : "No answer."}
        </span>{" "}
        <span className="text-dim">{turn.error.message}</span>
        {retry && (
          <button type="button" onClick={onRetry} className="ms-2 text-accent underline underline-offset-4">
            Ask again
          </button>
        )}
      </div>
    );
  }

  const r = turn.response;
  if (!r) return null;

  if (r.blocked) {
    return (
      <p className="mt-3 max-w-[64ch] text-[15px]">
        <span className="font-medium text-bad">Blocked by the input guard.</span>{" "}
        {r.reason && <span className="text-fg">{sentence(r.reason)} </span>}
        <span className="text-dim">Nothing was searched and the answer model never saw the question.</span>
      </p>
    );
  }

  // With no sources the model had nothing to answer from; its wording ("not available at your
  // access level") would hint that restricted documents exist, so show a neutral line instead.
  if (r.sources.length === 0) {
    return (
      <p className="mt-3 max-w-[64ch] font-doc text-[16.5px] leading-relaxed">
        No documents at {turn.username}’s clearance matched this question.{" "}
        <span className="text-dim">Ask a colleague who has access if you need it.</span>
      </p>
    );
  }

  const tokensForAnswer = r.answer_tokens?.length ? r.answer_tokens : r.vault_tokens;

  return (
    <>
      <Redacted
        text={r.answer}
        className="mt-3 max-w-[64ch] font-doc text-[16.5px] leading-[1.7]"
        cite={{ count: r.sources.length, selected: active ? cite : null, onCite }}
        vaultTokens={tokensForAnswer}
        unmaskedMap={unmaskedMap}
        onSelectToken={onSelectToken}
      />
      {r.proposed_actions && r.proposed_actions.length > 0 && (
        <ActionSandboxPanel
          actions={r.proposed_actions}
          currentUsername={currentUsername}
          currentUserTier={currentUserTier}
          onExecuted={onActionExecuted}
        />
      )}
    </>
  );
}

export function Thread({
  turns,
  activeKey,
  cite,
  onSelect,
  onCite,
  onRetry,
  onStop,
  currentUsername = "teller1",
  currentUserTier = 1,
  unmaskedMap,
  onSelectToken,
  onActionExecuted = () => {},
}: {
  turns: Turn[];
  activeKey: number | null;
  cite: number | null;
  maxTier: number;
  onSelect: (key: number) => void;
  onCite: (key: number, n: number) => void;
  onRetry: (turn: Turn) => void;
  onStop: () => void;
  currentUsername?: string;
  currentUserTier?: number;
  unmaskedMap?: Record<string, string>;
  onSelectToken?: (token: VaultToken) => void;
  onActionExecuted?: () => void;
}) {
  const lastRef = useRef<HTMLElement | null>(null);
  const count = turns.length;

  useEffect(() => {
    if (count) lastRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [count]);

  if (!count) return null;

  return (
    <ol className="space-y-4" aria-label="Questions and answers">
      {turns.map((turn, i) => {
        const active = turn.key === activeKey;
        return (
          <li key={turn.key} className="w-full">
            <ProximityGlow
              range={70}
              className={cn(
                "border-line-soft! transition-all duration-200",
                active && "ring-1 ring-accent/60 shadow-[0_0_28px_rgba(56,189,248,0.12)]",
              )}
              edgeSensitivity={30}
              glowColor="215 85 72"
              backgroundColor="var(--ink-900)"
              borderRadius={20}
              glowRadius={56}
              glowIntensity={1.0}
              coneSpread={25}
              animated={false}
              colors={["#1e3fd8", "#38bdf8", "#a5d8ff"]}
            >
              <article
                ref={i === count - 1 ? lastRef : undefined}
                onClick={() => onSelect(turn.key)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "w-full cursor-pointer p-5 sm:p-6 transition-colors",
                  active ? "bg-raised/40" : "hover:bg-raised/20",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="num font-ledger text-xs text-faint">
                    <span className="text-dim">
                      {turn.askedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                    </span>
                    <span className="ms-3 font-sans font-medium text-accent">
                      {turn.username}
                    </span>
                    <span className="ms-1.5 rounded-full border border-line-soft bg-raised px-2 py-0.5 text-[11px] text-faint">
                      Tier {turn.tier}
                    </span>
                  </p>
                  {active && (
                    <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                      Active
                    </span>
                  )}
                </div>

                <h2 dir="auto" className="mt-2.5 max-w-[62ch] text-lg font-medium leading-snug tracking-normal text-fg">
                  {turn.question}
                </h2>

                <Body
                  turn={turn}
                  active={active}
                  cite={cite}
                  onCite={(n) => onCite(turn.key, n)}
                  onRetry={() => onRetry(turn)}
                  onStop={onStop}
                  currentUsername={currentUsername}
                  currentUserTier={currentUserTier}
                  unmaskedMap={unmaskedMap}
                  onSelectToken={onSelectToken}
                  onActionExecuted={onActionExecuted}
                />

                <Facts turn={turn} />
              </article>
            </ProximityGlow>
          </li>
        );
      })}
    </ol>
  );
}
