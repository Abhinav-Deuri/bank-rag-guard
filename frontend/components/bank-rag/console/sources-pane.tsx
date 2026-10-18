"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Redacted, type RevealProps } from "./redacted";
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
  reveal,
}: {
  turn: Turn | null;
  cite: number | null;
  onCite: (n: number) => void;
  maxTier: number;
  reveal?: RevealProps;
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
  else if (turn.status === "pending") empty = "Waiting for the answer.";
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

      {sources.length > 0 && (
        <ol className="mt-3">
          {sources.map((s, i) => {
            const on = cite === i + 1;
            return (
              <li
                key={`${s.id}-${i}`}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                className={cn("-mx-3 border-t border-line-soft px-3 py-2.5", on && "bg-raised")}
              >
                <button
                  type="button"
                  onClick={() => onCite(i + 1)}
                  aria-pressed={on}
                  className="num flex w-full flex-wrap gap-x-3.5 gap-y-0.5 text-start font-ledger text-xs text-faint"
                >
                  <span className={cn("font-medium", on ? "text-accent" : "text-dim")}>{i + 1}</span>
                  <span className="text-dim">#{s.id}</span>
                  <span>{kindOf(s.source)}</span>
                  <span>Tier {s.tier}</span>
                  <span title="Similarity between the question and this passage, not answer confidence">
                    match {s.score.toFixed(3)}
                  </span>
                </button>
                <Redacted text={s.text} reveal={reveal} className="mt-1 font-doc text-sm leading-[1.75] text-dim" />
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
    </section>
  );
}
