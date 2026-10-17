"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { AskResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Mode = "similarity" | "masking";

interface Bar {
  key: string;
  label: string;
  /** 0 to 1, height of the bar */
  fraction: number;
  display: string;
  detail: string;
}

const PLACEHOLDER = [0.42, 0.58, 0.8, 0.5, 0.7, 0.62, 0.86, 0.48, 0.56, 0.4];

function buildBars(mode: Mode, response: AskResponse | null): { bars: Bar[]; ticks: string[]; big: string; caption: string } {
  if (!response) return { bars: [], ticks: [], big: "—", caption: "" };

  if (mode === "similarity") {
    const bars = response.sources.map((s) => ({
      key: String(s.id),
      label: `#${s.id}`,
      fraction: Math.max(0, Math.min(1, s.score)),
      display: s.score.toFixed(3),
      detail: `${s.source} · Tier ${s.tier}`,
    }));
    const top = response.sources.reduce((m, s) => Math.max(m, s.score), 0);
    return {
      bars,
      ticks: ["1.0", "0.75", "0.5", "0.25", "0"],
      big: bars.length ? top.toFixed(3) : "—",
      caption: "Highest retrieval similarity (how close a passage is to the question, not answer accuracy)",
    };
  }

  const entries = Object.entries(response.masked_in_context);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const step = Math.max(1, Math.ceil(max / 4));
  const top = step * 4;
  return {
    bars: entries.map(([label, n]) => ({
      key: label,
      label,
      fraction: n / top,
      display: String(n),
      detail: `${label} × ${n} masked in retrieved passages`,
    })),
    ticks: [top, step * 3, step * 2, step, 0].map(String),
    big: String(total),
    caption: "Items masked in the retrieved passages, by type (as reported by the backend)",
  };
}

/**
 * Bar chart of the latest response. Similarity per returned source, or masked items by type.
 * Nothing here is invented: with no answer yet it shows muted placeholder bars and says so.
 */
export function InsightsChart({ response, loading }: { response: AskResponse | null; loading: boolean }) {
  const [mode, setMode] = useState<Mode>("similarity");
  const [hovered, setHovered] = useState<number | null>(null);
  const tabsId = useId();

  const { bars, ticks, big, caption } = useMemo(() => buildBars(mode, response), [mode, response]);

  const best = bars.reduce((bi, b, i, all) => (b.fraction > all[bi].fraction ? i : bi), 0);
  const active = hovered !== null && hovered < bars.length ? hovered : best;
  const empty = bars.length === 0;

  const emptyText = loading
    ? "Waiting for the answer…"
    : !response
      ? "Ask a question to fill this chart."
      : response.blocked
        ? "The input guard blocked this request, so nothing was retrieved."
        : mode === "similarity"
          ? "No sources were returned for this request."
          : "No masking matches were reported for this request.";

  return (
    <section id="insights" aria-labelledby={`${tabsId}-title`} className="dash-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id={`${tabsId}-title`} className="text-base font-semibold">
            Retrieval insights
          </h2>
          <p className="num mt-2 text-[2rem] font-semibold leading-none tracking-tight">{big}</p>
          {caption ? <p className="mt-2 max-w-[34rem] text-xs leading-relaxed text-faint">{caption}</p> : null}
        </div>
        <span className="rounded-full border border-line-soft bg-bg/50 px-3.5 py-1.5 text-sm text-dim">
          Latest answer
        </span>
      </div>

      <div className="mt-4">
        <div role="tablist" aria-label="Chart data" className="flex gap-1 text-sm">
          {(
            [
              ["similarity", "Similarity"],
              ["masking", "Masking"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={mode === id}
              onClick={() => {
                setMode(id);
                setHovered(null);
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 font-medium outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                mode === id ? "bg-inset text-fg" : "text-dim hover:text-fg",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <div aria-hidden className="num flex h-56 shrink-0 flex-col justify-between pb-0 text-xs text-faint">
          {(empty ? ["1.0", "0.75", "0.5", "0.25", "0"] : ticks).map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0 leading-none">
              {t}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-56">
            <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="block border-t border-dashed border-line-soft" />
              ))}
            </div>

            {empty ? (
              <>
                <div aria-hidden className="absolute inset-0 flex items-end gap-3 px-1">
                  {PLACEHOLDER.map((h, i) => (
                    <span key={i} className="flex-1 rounded-t-2xl bg-inset/60" style={{ height: `${h * 100}%` }} />
                  ))}
                </div>
                <p
                  role="status"
                  className="absolute inset-0 grid place-items-center px-6 text-center text-sm font-medium text-dim"
                >
                  <span className="rounded-xl bg-panel/85 px-4 py-2 backdrop-blur-sm">{emptyText}</span>
                </p>
              </>
            ) : (
              <ul className="absolute inset-0 flex items-end gap-3 px-1" onMouseLeave={() => setHovered(null)}>
                {bars.map((bar, i) => {
                  const on = i === active;
                  return (
                    <li key={bar.key} className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                      {on ? (
                        <span
                          aria-hidden
                          className="num absolute z-10 -translate-y-1 whitespace-nowrap rounded-lg bg-fg px-2.5 py-1 text-xs font-semibold text-bg shadow-lg"
                          style={{ bottom: `calc(${Math.max(bar.fraction, 0.04) * 100}% + 0.5rem)` }}
                        >
                          {bar.display}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`${bar.detail}: ${bar.display}`}
                        onMouseEnter={() => setHovered(i)}
                        onFocus={() => setHovered(i)}
                        onBlur={() => setHovered(null)}
                        className="group flex h-full w-full max-w-14 items-end justify-center rounded-t-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        <motion.span
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                          style={{ height: `${Math.max(bar.fraction, 0.04) * 100}%`, transformOrigin: "bottom" }}
                          className={cn(
                            "block w-full rounded-t-2xl transition-colors duration-200",
                            on
                              ? "bg-[linear-gradient(180deg,var(--lime),color-mix(in_oklab,var(--lime)_72%,#2a6a00))]"
                              : "bg-inset group-hover:bg-line",
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div aria-hidden className="mt-2 flex gap-3 px-1">
            {bars.map((bar) => (
              <span key={bar.key} className="num min-w-0 flex-1 truncate text-center text-xs text-faint">
                {bar.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {!empty ? (
        <table className="sr-only">
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th>Item</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((bar) => (
              <tr key={bar.key}>
                <td>{bar.detail}</td>
                <td>{bar.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
