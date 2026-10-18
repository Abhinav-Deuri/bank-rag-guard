"use client";

import { useEffect, useRef } from "react";
import type { ApiError } from "@/lib/api/errors";
import type { AskResponse } from "@/lib/api/types";
import { useElapsed } from "@/hooks/use-elapsed";
import { cn } from "@/lib/utils";
import { Redacted, type RevealProps } from "./redacted";

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
    <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-dim">
      <p role="status">
        Screening the question, then searching {tierRange(turn.tier)}. <span className="num">{seconds} s</span> so far;
        answers usually take 10 to 40 seconds.
      </p>
      <button type="button" onClick={onStop} className="text-faint underline underline-offset-4 hover:text-fg">
        Stop waiting
      </button>
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
        {
          k: "Withheld",
          v: String(r.dropped_passages ?? 0),
          tone: r.dropped_passages ? "warn" : undefined,
        },
        { k: "Removed", v: removedText(sum(r.masked_in_context)) },
      ];
  const caught = sum(r.masked_in_answer);
  if (caught) facts.push({ k: "Caught in answer", v: String(caught), tone: "warn" });
  const m = r.mosaic;
  if (m)
    facts.push({
      k: "Customers this hour",
      v: `${m.customers_last_hour} of ${m.limit}`,
      tone: m.alert ? "warn" : undefined,
    });

  return (
    <>
      <dl className="mt-2.5 flex flex-wrap gap-y-1 text-[12.5px]" aria-label="What the safeguards did">
        {facts.map((f) => (
          <div key={f.k} className="me-3.5 flex gap-1.5 border-e border-line-soft pe-3.5 last:border-e-0">
            <dt className="text-faint">{f.k}</dt>
            <dd className={cn("num", f.tone === "bad" ? "text-bad" : f.tone === "warn" ? "text-warn" : "text-fg")}>
              {f.v}
            </dd>
          </div>
        ))}
      </dl>
      {m?.alert && (
        <p className="mt-1.5 max-w-[68ch] text-[12.5px] text-warn">
          {turn.username} has now seen records of {m.customers_last_hour} different customers within an hour. That can
          add up to more than any single answer shows, so a review alert was written to the audit log.
        </p>
      )}
    </>
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
}: {
  turn: Turn;
  active: boolean;
  cite: number | null;
  onCite: (n: number) => void;
  onRetry: () => void;
  onStop: () => void;
  reveal?: RevealProps;
}) {
  if (turn.status === "pending") return <Pending turn={turn} onStop={onStop} />;

  if (turn.status === "error" && turn.error) {
    const retry = turn.error.kind !== "bad_request" && turn.error.kind !== "cancelled";
    return (
      <div role="alert" className="mt-3 max-w-[64ch] text-[15px]">
        <span className={cn("font-medium", turn.error.kind === "rate_limited" ? "text-warn" : "text-bad")}>
          {turn.error.kind === "rate_limited"
            ? "Too many questions."
            : turn.error.kind === "cancelled"
              ? "Stopped."
              : "No answer."}
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

  return (
    <Redacted
      text={r.answer}
      className="mt-3 max-w-[64ch] font-doc text-[16.5px] leading-[1.7]"
      cite={{ count: r.sources.length, selected: active ? cite : null, onCite }}
      reveal={reveal}
    />
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
}) {
  const lastRef = useRef<HTMLElement | null>(null);
  const count = turns.length;

  useEffect(() => {
    if (count) lastRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [count]);

  if (!count) return null;

  return (
    <ol className="-mx-4 sm:-mx-5" aria-label="Questions and answers">
      {turns.map((turn, i) => {
        const active = turn.key === activeKey;
        return (
          <li key={turn.key}>
            <article
              ref={i === count - 1 ? lastRef : undefined}
              onClick={() => onSelect(turn.key)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "border-b border-line-soft px-4 py-5 sm:px-5",
                active ? "bg-raised" : "cursor-pointer hover:bg-raised/50",
              )}
            >
              <p className="num font-ledger text-xs text-faint">
                <span className="text-dim">
                  {turn.askedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </span>
                <span className="ms-4">
                  {turn.username}, tier {turn.tier}
                </span>
              </p>
              <h2 dir="auto" className="mt-1.5 max-w-[62ch] text-lg font-medium leading-snug tracking-normal">
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
              />
              <Facts turn={turn} />
            </article>
          </li>
        );
      })}
    </ol>
  );
}
