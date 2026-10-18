"use client";

import { useMemo, useState } from "react";
import type { useAudit } from "@/hooks/use-audit";
import { toAuditRow, type AuditRow } from "@/lib/audit-format";
import { cn } from "@/lib/utils";
import { Redacted } from "./redacted";

type Audit = ReturnType<typeof useAudit>;

function short(hash: string | null) {
  return hash ? hash.slice(0, 8) : "";
}

function ChainStatus({ audit }: { audit: Audit }) {
  const { data, error, loading, checkedAt, refresh } = audit;
  const at = checkedAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  if (error && !data) {
    return (
      <p role="alert" className="mt-1.5 text-[13px] text-dim">
        <span className="font-medium text-bad">Couldn’t read the audit log.</span> {error.message}{" "}
        <button type="button" onClick={refresh} className="text-accent underline underline-offset-4">
          Try again
        </button>
      </p>
    );
  }
  if (!data) return <p className="mt-1.5 text-[13px] text-faint">{loading ? "Checking the chain…" : ""}</p>;

  const total = data.message.match(/all (\d+) entries/)?.[1];
  return (
    <p className="mt-1.5 text-[13px] text-dim" role={data.ok ? undefined : "alert"}>
      {data.ok ? (
        <>
          <span className="font-medium text-ok">Chain verified.</span>{" "}
          <span className="num">{total ? `All ${total} entries match their fingerprints` : data.message}</span>
        </>
      ) : (
        <>
          <span className="font-medium text-bad">Chain broken.</span> {data.message}.
        </>
      )}
      {at && <span className="num">, checked {at}</span>}
      {error && <span className="text-warn"> The last refresh failed.</span>}
    </p>
  );
}

export function AuditLog({ audit }: { audit: Audit }) {
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const rows = useMemo(() => (audit.data?.entries ?? []).map(toAuditRow), [audit.data]);
  const shown = onlyBlocked ? rows.filter((r) => r.kind === "blocked" || r.kind === "alert") : rows;
  const hasHashes = rows.some((r) => r.hash);
  const hasTimes = rows.some((r) => r.time);

  // Rows arrive newest first. An entry's "prev" should equal the fingerprint of the entry below it.
  const brokenLink = (row: AuditRow, i: number) => {
    const below = rows[rows.indexOf(row) + 1];
    return !onlyBlocked && i >= 0 && below && below.id === row.id - 1 && row.prevHash && below.hash && row.prevHash !== below.hash;
  };

  return (
    <section aria-labelledby="audit-h" className="flex min-h-0 w-full flex-col px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="audit-h" className="text-[15px] font-medium tracking-normal">
          Audit log
        </h2>
        <div className="flex items-baseline gap-3.5 text-[13px]" role="group" aria-label="Show entries">
          {[
            { on: !onlyBlocked, label: "All", set: false },
            { on: onlyBlocked, label: "Blocks and alerts", set: true },
          ].map((f) => (
            <button
              key={f.label}
              type="button"
              aria-pressed={f.on}
              onClick={() => setOnlyBlocked(f.set)}
              className={cn("border-b-[1.5px] py-0.5", f.on ? "border-fg text-fg" : "border-transparent text-dim hover:text-fg")}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={audit.refresh}
            disabled={audit.loading}
            className="text-dim hover:text-fg disabled:opacity-60"
          >
            {audit.loading ? "Checking…" : "Verify again"}
          </button>
        </div>
      </div>

      <ChainStatus audit={audit} />

      {audit.data && shown.length === 0 && (
        <p className="mt-4 text-sm text-dim">{onlyBlocked ? "No blocked questions among the latest entries." : "The log is empty."}</p>
      )}

      {shown.length > 0 && (
        <div className="mt-3 min-h-0 overflow-y-auto lg:max-h-[26rem]">
          <table className="num w-full border-collapse font-ledger text-xs">
            <caption className="sr-only">Latest audit log entries, newest first</caption>
            <thead>
              <tr className="text-start text-faint">
                <th scope="col" className="border-b border-line pb-1.5 pe-2 text-start font-normal">#</th>
                {hasTimes && <th scope="col" className="border-b border-line px-2 pb-1.5 text-start font-normal">Time</th>}
                <th scope="col" className="border-b border-line px-2 pb-1.5 text-start font-normal">Event</th>
                {hasHashes && <th scope="col" className="border-b border-line ps-2 pb-1.5 text-end font-normal">Fingerprint</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((row, i) => {
                const broken = brokenLink(row, i);
                return (
                  <tr key={row.id} className="align-top">
                    <td className="border-b border-line-soft py-2 pe-2 text-dim">{row.id}</td>
                    {hasTimes && <td className="border-b border-line-soft px-2 py-2 text-faint">{row.time}</td>}
                    <td className="border-b border-line-soft px-2 py-2 font-sans text-[13px]">
                      <span className={cn(row.kind === "blocked" ? "text-bad" : row.kind === "learned" || row.kind === "alert" ? "text-warn" : row.kind === "reveal" ? "text-accent" : row.kind === "answer" ? "text-fg" : "text-dim")}>
                        {row.label}
                      </span>{" "}
                      <span className="text-faint">{row.actor}</span>
                      {row.detail && (
                        <Redacted text={row.detail} className="mt-px text-[12.5px] leading-snug text-dim" />
                      )}
                    </td>
                    {hasHashes && (
                      <td className="whitespace-nowrap border-b border-line-soft py-2 ps-2 text-end">
                        <div className="text-dim">{short(row.hash)}</div>
                        <div className={broken ? "text-bad" : "text-faint"} title="Fingerprint of the entry before this one">
                          prev {short(row.prevHash)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[12.5px] text-faint">
        {hasHashes
          ? "Each fingerprint includes the one before it, so editing any entry breaks every entry after it. "
          : ""}
        Shows the latest 12 entries; verification covers the whole log. Questions are stored with personal details
        already removed.
      </p>
    </section>
  );
}
