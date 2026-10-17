"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChainStatus, deriveChain, type ChainState } from "@/components/bank-rag/chain-status";
import { CollapsibleSection } from "@/components/bank-rag/collapsible-section";
import { ErrorState } from "@/components/bank-rag/error-state";
import type { ApiError } from "@/lib/api/errors";
import type { AuditEntry, AuditResponse } from "@/lib/api/types";
import { cn, formatClock } from "@/lib/utils";

function actionTone(action: string): "bad" | "ok" | "neutral" {
  if (/block/i.test(action)) return "bad";
  if (/answer|return/i.test(action)) return "ok";
  return "neutral";
}

function EntryRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const long = entry.details.length > 90;
  return (
    <li className="rounded-lg border border-line-soft bg-raised/40 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="num font-mono text-xs text-faint">#{entry.id}</span>
        <span className="text-sm font-medium text-fg">{entry.actor}</span>
        <Badge tone={actionTone(entry.action)} className="font-mono">
          {entry.action}
        </Badge>
      </div>
      <p
        dir="auto"
        className={cn(
          "mt-2 font-mono text-xs leading-relaxed text-dim [overflow-wrap:anywhere]",
          !expanded && "line-clamp-2",
        )}
      >
        {entry.details}
      </p>
      {long ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 rounded text-xs text-accent underline-offset-4 hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </li>
  );
}

export function AuditPanel({
  data,
  error,
  loading,
  checkedAt,
  onRefresh,
  filter,
  onFilterChange: setFilter,
}: {
  data: AuditResponse | null;
  error: ApiError | null;
  loading: boolean;
  checkedAt: Date | null;
  onRefresh: () => void;
  /** Client-side filter over the displayed events; shared with the search pill. */
  filter: string;
  onFilterChange: (value: string) => void;
}) {
  const chain: ChainState = deriveChain(data, error);
  const chainMessage = error
    ? "The last check failed, so the chain's state isn't known right now."
    : data?.message;

  const entries = useMemo(() => {
    const all = data?.entries ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return all;
    return all.filter((e) => `${e.id} ${e.actor} ${e.action} ${e.details}`.toLowerCase().includes(q));
  }, [data, filter]);

  return (
    <div className="dash-card p-5">
      <CollapsibleSection
        title="Audit trail"
        headingLevel="h2"
        defaultOpen={false}
        summary={<ChainStatus state={chain} compact />}
        bodyClassName="pt-4"
      >
        <div className="space-y-4">
          <ChainStatus state={chain} message={chainMessage} />

          <p className="text-xs leading-relaxed text-faint">
            Verification covers the whole hash chain. The API lists only the latest 12 entries, newest first.
            Timestamps and hashes aren&rsquo;t exposed.
          </p>

          {error ? (
            <ErrorState
              tone="warn"
              title="Couldn't refresh the audit log"
              action={
                <Button size="sm" variant="secondary" onClick={onRefresh} loading={loading}>
                  Try again
                </Button>
              }
            >
              {error.message}
              {data ? " Showing entries from the last successful refresh." : null}
            </ErrorState>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p className="text-xs text-faint" aria-live="off">
              {checkedAt ? (
                <>
                  Last refreshed in this browser{" "}
                  <span className="num text-dim">{formatClock(checkedAt)}</span>
                </>
              ) : loading ? (
                "Checking…"
              ) : (
                "Not checked yet"
              )}
            </p>
            <Button size="sm" variant="secondary" onClick={onRefresh} loading={loading} aria-label="Refresh audit log">
              {!loading ? <RefreshCw className="size-4" aria-hidden /> : null}
              Refresh
            </Button>
          </div>

          {data ? (
            <>
              <div>
                <label htmlFor="audit-filter" className="mb-1.5 block text-xs font-medium text-faint">
                  Filter displayed events
                </label>
                <input
                  id="audit-filter"
                  type="search"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Actor, action or details"
                  className="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg outline-none transition-colors placeholder:text-faint hover:border-accent/50 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/60"
                />
              </div>

              {entries.length > 0 ? (
                <ol className="max-h-[30rem] space-y-2.5 overflow-y-auto pr-1" aria-label="Latest audit events">
                  <AnimatePresence initial={false}>
                    {entries.map((entry) => (
                      <motion.div
                        key={entry.id}
                        layout="position"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <EntryRow entry={entry} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </ol>
              ) : (
                <p className="rounded-lg border border-dashed border-line px-4 py-3.5 text-sm text-dim">
                  {data.entries.length === 0
                    ? "The backend returned no audit entries."
                    : "No displayed events match this filter."}
                </p>
              )}
            </>
          ) : loading ? (
            <div role="status" className="space-y-2.5">
              <span className="sr-only">Loading audit entries…</span>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[4.25rem]" />
              ))}
            </div>
          ) : null}
        </div>
      </CollapsibleSection>
    </div>
  );
}
