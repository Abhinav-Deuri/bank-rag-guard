"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
  /** "note" is the output of a screen command such as help; it has no response. */
  status: "pending" | "done" | "error" | "note";
  note?: ReactNode;
  response?: AskResponse;
  error?: ApiError;
}

/** A suggested next step under the latest answer. */
export interface NextStep {
  label: string;
  run: () => void;
}

/** "attempts to reveal system prompt" -> "Attempts to reveal system prompt." */
function sentence(text: string) {
  const t = text.trim().replace(/[.\s]+$/, "");
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}.` : "";
}

function sum(counts: Record<string, number> | undefined) {
  return Object.values(counts ?? {}).reduce((a, b) => a + b, 0);
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function tierRange(tier: number) {
  return tier === 1 ? "tier 1 only" : `tiers 1–${tier}`;
}

// ---------- The trace: one line per safeguard, in the style of a boot log ----------
// Lines fade in once, when the trace mounts (CSS); re-renders don't replay it.

type Status = "ok" | "fail" | "warn" | "skip";
interface Step {
  status: Status;
  stage: string;
  detail: string;
  /** A few words for the status strip. */
  short: string;
  /** Plain-language explanation, shown on hover. */
  hint?: string;
}

const TAG: Record<Status, string> = { ok: "[ OK ]", fail: "[FAIL]", warn: "[WARN]", skip: "[SKIP]" };
const TONE: Record<Status, string> = { ok: "text-ok", fail: "text-bad", warn: "text-warn", skip: "text-faint" };

const MOSAIC_HINT =
  "Counts how many different customers\u2019 records reached this person\u2019s answers in the last hour. Many small answers can add up to more than any one shows, so crossing the limit writes a review alert.";

export function stepsFor(r: AskResponse, maxTier: number): Step[] {
  const logged: Step = {
    status: "ok",
    stage: "Audit log",
    detail: r.answer_id ? `recorded as entry #${r.answer_id}, chained to the one before` : "recorded",
    short: r.answer_id ? `Logged #${r.answer_id}` : "Logged",
  };
  if (r.blocked) {
    return [
      {
        status: "fail",
        stage: "Input guard",
        detail: r.reason ? sentence(r.reason) : "The question looked like an attack.",
        short: "Blocked by the guard",
      },
      { status: "skip", stage: "Document search", detail: "nothing was searched", short: "Nothing searched" },
      { status: "skip", stage: "Answer model", detail: "never saw the question", short: "Model never saw it" },
      { ...logged, detail: "the attempt is recorded, with personal details removed" },
    ];
  }
  const locked = r.tier < maxTier ? `; ${r.tier + 1 === maxTier ? `tier ${maxTier}` : `tiers ${r.tier + 1}–${maxTier}`} locked` : "";
  const removed = sum(r.masked_in_context);
  const caught = sum(r.masked_in_answer);
  const dropped = r.dropped_passages ?? 0;
  const steps: Step[] = [
    { status: "ok", stage: "Input guard", detail: "no attack found", short: "Guard passed" },
    {
      status: "ok",
      stage: "Clearance filter",
      detail: `searched ${tierRange(r.tier)}${locked}`,
      short: r.tier === 1 ? "Tier 1 only" : `Tiers 1–${r.tier}`,
    },
    r.sources.length === 0
      ? { status: "skip", stage: "Passage screen", detail: "no documents at this clearance matched", short: "No documents" }
      : dropped
        ? {
            status: "warn",
            stage: "Passage screen",
            detail: `kept ${r.sources.length}, withheld ${dropped} with hidden instructions`,
            short: `${dropped} withheld`,
          }
        : {
            status: "ok",
            stage: "Passage screen",
            detail: `${plural(r.sources.length, "passage")} checked, none withheld`,
            short: plural(r.sources.length, "passage"),
          },
    {
      status: "ok",
      stage: "Masking",
      detail: removed
        ? `removed ${plural(removed, "personal detail")} before the model read anything`
        : "no personal details in these passages",
      short: removed ? `${removed} masked` : "Nothing to mask",
    },
    caught
      ? {
          status: "warn",
          stage: "Answer check",
          detail: `caught ${plural(caught, "detail")} in the answer and removed them`,
          short: `${caught} caught in answer`,
        }
      : { status: "ok", stage: "Answer check", detail: "no personal details in the answer", short: "Answer clean" },
  ];
  const m = r.mosaic;
  if (m) {
    steps.push(
      m.alert
        ? {
            status: "warn",
            stage: "Mosaic check",
            detail: `${m.customers_last_hour} different customers this hour (limit ${m.limit}); review alert logged`,
            short: `${m.customers_last_hour} customers: alert`,
            hint: MOSAIC_HINT,
          }
        : {
            status: "ok",
            stage: "Mosaic check",
            detail: `${m.customers_last_hour} of ${m.limit} different customers this hour`,
            short: `${m.customers_last_hour}/${m.limit} customers`,
            hint: MOSAIC_HINT,
          },
    );
  }
  steps.push(logged);
  return steps;
}

function Trace({ steps, animate }: { steps: Step[]; animate: boolean }) {
  return (
    <ol className="mt-2 text-[13px]" aria-label="What each safeguard did">
      {steps.map((s, i) => (
        <li
          key={s.stage}
          className={cn("grid grid-cols-[7ch_17ch_1fr] gap-x-1 max-sm:grid-cols-[7ch_1fr]", animate && "term-line-in")}
          style={animate ? ({ "--i": i } as CSSProperties) : undefined}
        >
          <span className={cn("whitespace-pre", TONE[s.status])}>{TAG[s.status]}</span>
          <span className="text-accent max-sm:hidden" title={s.hint}>
            {s.stage}
          </span>
          <span className={s.status === "skip" ? "text-faint" : "text-dim"}>
            <span className="text-accent sm:hidden">{s.stage}: </span>
            {s.detail}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The safeguards as a row of small status boxes, with a button that opens the full trace. */
function Strip({ steps, open, onToggle }: { steps: Step[]; open: boolean; onToggle: () => void }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="What the safeguards did">
      {steps.map((s) => (
        <span key={s.stage} className="term-stat" data-s={s.status} title={`${s.stage}: ${s.detail}${s.hint ? `. ${s.hint}` : ""}`}>
          {s.short}
        </span>
      ))}
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="term-key text-[13px]"
      >
        {open ? "Hide details" : "Details"}
      </button>
    </div>
  );
}

function Pending({ turn, onStop }: { turn: Turn; onStop: () => void }) {
  const seconds = useElapsed(turn.startedAt);
  return (
    <div className="mt-2 text-[13px]">
      <p role="status" className="grid grid-cols-[7ch_1fr] gap-x-1">
        <span className="text-accent">[ .. ]</span>
        <span className="text-dim">
          Checking the question, then searching {tierRange(turn.tier)} and masking what it finds.{" "}
          <span className="num text-fg">{seconds} s</span>
          <span className="text-faint"> (usually 10 to 40)</span>
          <button type="button" onClick={onStop} className="term-key ms-3">
            Stop waiting
          </button>
        </span>
      </p>
    </div>
  );
}

function Answer({
  turn,
  active,
  cite,
  onCite,
  onRetry,
  reveal,
}: {
  turn: Turn;
  active: boolean;
  cite: number | null;
  onCite: (n: number) => void;
  onRetry: () => void;
  reveal?: RevealProps;
}) {
  if (turn.status === "error" && turn.error) {
    const retry = turn.error.kind !== "bad_request" && turn.error.kind !== "cancelled";
    return (
      <div role="alert" className="mt-2 max-w-[76ch]">
        <span className={turn.error.kind === "rate_limited" ? "text-warn" : "text-bad"}>
          {turn.error.kind === "rate_limited" ? "Too many questions." : turn.error.kind === "cancelled" ? "Stopped." : "No answer."}
        </span>{" "}
        <span className="text-dim">{turn.error.message}</span>
        {retry && (
          <button type="button" onClick={onRetry} className="term-key ms-2">
            Ask again
          </button>
        )}
      </div>
    );
  }

  const r = turn.response;
  if (!r) return null;

  if (r.blocked) {
    return <p className="term-answer mt-3 max-w-[76ch] text-fg">{r.answer}</p>;
  }

  // With no sources the model had nothing to answer from; its wording ("not available at your
  // access level") would hint that restricted documents exist, so show a neutral line instead.
  if (r.sources.length === 0) {
    return (
      <p className="term-answer mt-3 max-w-[76ch]">
        No documents at {turn.username}’s clearance matched this question.{" "}
        <span className="text-dim">Ask a colleague who has access if you need it.</span>
      </p>
    );
  }

  return (
    <Redacted
      text={r.answer}
      className="term-answer mt-3 max-w-[76ch] text-fg"
      cite={{ count: r.sources.length, selected: active ? cite : null, onCite }}
      reveal={reveal}
    />
  );
}

function Next({ steps }: { steps: NextStep[] }) {
  if (!steps.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
      <span className="text-faint">Next</span>
      {steps.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            s.run();
          }}
          className="term-key"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export function Thread({
  turns,
  activeKey,
  cite,
  maxTier,
  onSelect,
  onCite,
  onRetry,
  onStop,
  revealFor,
  nextFor,
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
  /** Suggested next steps, shown under the latest answer only. */
  nextFor?: (turn: Turn) => NextStep[];
}) {
  const lastRef = useRef<HTMLElement | null>(null);
  // Details open or closed by the person, per answer. Otherwise they open by themselves when a safeguard
  // blocked or flagged something on the latest answer.
  const [choice, setChoice] = useState<Record<number, boolean>>({});
  const count = turns.length;
  const lastAsked = [...turns].reverse().find((t) => t.status !== "note");

  useEffect(() => {
    if (count) lastRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [count]);

  if (!count) return null;

  return (
    <ol aria-label="Questions, answers and commands">
      {turns.map((turn, i) => {
        if (turn.status === "note") {
          return (
            <li key={turn.key}>
              <article className="border-b border-line-soft py-3">
                <p>
                  <span className="t-prompt">Command ===&gt;</span> <span className="t-string">{turn.question}</span>
                </p>
                {turn.note}
              </article>
            </li>
          );
        }
        const active = turn.key === activeKey;
        const latest = turn.key === lastAsked?.key;
        const steps = turn.response ? stepsFor(turn.response, maxTier) : null;
        const flagged = Boolean(steps?.some((s) => s.status === "warn" || s.status === "fail"));
        const open = choice[turn.key] ?? (latest && flagged);
        return (
          <li key={turn.key}>
            <article
              ref={i === count - 1 ? lastRef : undefined}
              onClick={() => onSelect(turn.key)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "-mx-3 border-b border-s-2 border-line-soft px-3 py-3.5 sm:-mx-5 sm:px-5",
                active ? "border-s-accent bg-raised" : "cursor-pointer border-s-transparent hover:bg-raised/60",
              )}
            >
              <p className="num text-[13px] text-faint">
                {turn.askedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                <span className="ms-3">
                  {turn.username}, reads {tierRange(turn.tier)}
                </span>
              </p>
              <h2 className="mt-0.5 max-w-[76ch] font-normal text-fg [text-wrap:pretty]">
                <span className="t-prompt">{turn.username} ===&gt;</span>{" "}
                <span dir="auto" className="t-string">
                  {turn.question}
                </span>
              </h2>
              {turn.status === "pending" && <Pending turn={turn} onStop={onStop} />}
              {steps && (
                <Strip steps={steps} open={open} onToggle={() => setChoice((c) => ({ ...c, [turn.key]: !open }))} />
              )}
              {steps && open && <Trace steps={steps} animate />}
              <Answer
                turn={turn}
                active={active}
                cite={cite}
                onCite={(n) => onCite(turn.key, n)}
                onRetry={() => onRetry(turn)}
                reveal={revealFor?.(turn)}
              />
              {latest && turn.status !== "pending" && nextFor && <Next steps={nextFor(turn)} />}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
