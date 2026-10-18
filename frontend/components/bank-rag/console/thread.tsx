"use client";

import { useEffect, useRef } from "react";
import type { ApiError } from "@/lib/api/errors";
import type { AskResponse, VaultToken } from "@/lib/api/types";
import { useElapsed } from "@/hooks/use-elapsed";
import { cn } from "@/lib/utils";
import { Redacted, type RevealProps } from "./redacted";
import { ActionSandboxPanel } from "./action-sandbox";
import { ProximityGlow } from "@/components/bank-rag/landing/proximity-glow";

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
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-dim">
        <p role="status">
          Screening the question, then searching {tierRange(turn.tier)}.{" "}
          <span className="num">{seconds} s</span> so far; answers usually take 10 to 40 seconds.
        </p>
        <button type="button" onClick={onStop} className="text-faint underline underline-offset-4 hover:text-fg">
          Stop waiting
        </button>
      </div>

      {/* Answer Paragraph Skeleton with Shimmer */}
      <div className="max-w-[64ch] space-y-2 py-1">
        {/* Line 1 */}
        <div className="skeleton-shimmer h-4 w-11/12 rounded" />
        {/* Line 2 with mock redacted token */}
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer h-4 w-1/3 rounded" />
          <div className="skeleton-shimmer h-4.5 w-24 rounded border border-accent/30 bg-accent/15" />
          <div className="skeleton-shimmer h-4 flex-1 rounded" />
        </div>
        {/* Line 3 with second mock token */}
        <div className="flex items-center gap-2">
          <div className="skeleton-shimmer h-4 w-1/4 rounded" />
          <div className="skeleton-shimmer h-4.5 w-32 rounded border border-accent/30 bg-accent/15" />
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
        { k: "Clearance", v: `tier ${turn.tier}` },
        { k: "Searched", v: "0 documents" },
        { k: "Learned examples active", v: String(r.learned_attacks_count ?? 0) },
      ]
    : [
        { k: "Guard", v: "allowed" },
        { k: "Clearance", v: `tier ${turn.tier}` },
        { k: "Searched", v: tierRange(turn.tier) },
        { k: "Sources used", v: `${r.sources.length}` },
        { k: "Hidden in context", v: removedText(sum(r.masked_in_context)) },
        { k: "Withheld by screen", v: `${r.dropped_passages ?? 0}` },
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
      {facts.map(({ k, v, tone }, i) => (
        <span key={k} className="inline-flex items-baseline text-faint">
          {i > 0 && <span className="select-none px-2 text-line">/</span>}
          <dt className="text-faint">{k}:</dt>
          <dd className={cn("ms-1 font-medium", tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-dim")}>
            {v}
          </dd>
        </span>
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
  reveal,
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
  reveal?: RevealProps;
  currentUsername: string;
  currentUserTier: number;
  unmaskedMap?: Record<string, string>;
  onSelectToken?: (token: VaultToken) => void;
  onActionExecuted: () => void;
}) {
  if (turn.status === "pending") return <Pending turn={turn} onStop={onStop} />;

  if (turn.status === "error") {
    const error = turn.error;
    const isServer = error?.kind === "server" || error?.kind === "timeout" || error?.kind === "unreachable";
    return (
      <div role="alert" className="mt-3 max-w-[60ch] text-sm text-dim">
        <p className="font-medium text-bad">
          {error?.kind === "rate_limited" ? "Request limit reached." : "No answer."}
        </p>
        <p className="mt-1 leading-relaxed">{error?.message ?? "Something went wrong."}</p>
        {isServer && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-xs text-accent underline underline-offset-4 hover:text-fg"
          >
            Ask again
          </button>
        )}
      </div>
    );
  }

  const r = turn.response;
  if (!r) return null;

  if (r.blocked) {
    const reason = r.reason ? sentence(r.reason) : "";
    return (
      <div role="alert" className="mt-3 max-w-[62ch]">
        <p className="font-medium text-bad">{r.answer}</p>
        {reason && <p className="mt-1 text-sm text-dim">{reason}</p>}
      </div>
    );
  }

  const tokensForAnswer = r.answer_tokens?.length ? r.answer_tokens : r.vault_tokens;

  return (
    <>
      <Redacted
        text={r.answer}
        className="mt-3 max-w-[64ch] font-doc text-[16.5px] leading-[1.7]"
        cite={{ active: active ? cite : null, onCite }}
        reveal={reveal}
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
  revealFor,
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
  /** Reveal state and actions for one answer's redaction bars. */
  revealFor?: (turn: Turn) => RevealProps | undefined;
  currentUsername?: string;
  currentUserTier?: number;
  unmaskedMap?: Record<string, string>;
  onSelectToken?: (token: VaultToken) => void;
  onActionExecuted?: () => void;
}) {
  const lastRef = useRef<HTMLElement | null>(null);
  const count = turns.length;

  useEffect(() => {
    lastRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
                  reveal={revealFor?.(turn)}
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
