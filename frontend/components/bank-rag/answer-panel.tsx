"use client";

import { motion } from "framer-motion";
import { Ban, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CollapsibleSection } from "@/components/bank-rag/collapsible-section";
import { EmptyState } from "@/components/bank-rag/empty-state";
import { MaskedText } from "@/components/bank-rag/masked-text";
import { SecuritySummary } from "@/components/bank-rag/security-summary";
import { SourceCard } from "@/components/bank-rag/source-card";
import { useElapsed } from "@/hooks/use-elapsed";
import type { AskState } from "@/hooks/use-ask";

const EASE = [0.16, 1, 0.3, 1] as const;

function Loading({ startedAt, username }: { startedAt: number; username: string }) {
  const seconds = useElapsed(startedAt);
  return (
    <div className="dash-card p-5 sm:p-6">
      {/* One calm announcement; the ticking timer is hidden from assistive tech. */}
      <p role="status" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-base font-medium">
        Processing your question…
        <span aria-hidden className="num text-sm font-normal text-faint">
          {seconds}s
        </span>
      </p>
      <p className="mt-1 text-sm text-dim">
        Asking as {username}. The answer appears all at once when the whole pipeline has finished; it is not streamed.
      </p>
      <div className="mt-5 space-y-2.5">
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-[78%]" />
        <Skeleton className="h-4 w-[64%]" />
      </div>
    </div>
  );
}

export function AnswerPanel({ state }: { state: AskState }) {
  if (state.status === "loading") {
    return <Loading startedAt={state.startedAt} username={state.username} />;
  }

  if (state.status !== "success") {
    return (
      <div className="dash-card p-5 sm:p-6">
        <EmptyState icon={<MessageSquareText />} title="No answer yet" className="border-0 p-0">
          Pick a sample scenario or type a question, then ask. The answer, what the server applied, and the masked
          sources it used will appear here.
        </EmptyState>
      </div>
    );
  }

  const { response, question } = state;
  const n = response.sources.length;

  return (
    <motion.article
      aria-label="Assistant answer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="dash-card space-y-6 p-5 sm:p-6"
    >
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-1 text-lg font-medium">Answer</h2>
          <Badge tone="accent" className="num">
            {response.username} · Tier {response.tier}
          </Badge>
          {response.blocked ? (
            <Badge tone="bad">
              <Ban aria-hidden />
              Blocked by input guard
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-faint">
          You asked: <MaskedText as="span" text={question} className="text-dim" />
        </p>
      </header>

      <MaskedText text={response.answer} className="text-[1.0625rem] leading-[1.75] text-fg" />

      <SecuritySummary response={response} />

      <CollapsibleSection
        title="Sources"
        count={n}
        defaultOpen
        headerClassName="border-t border-line-soft pt-5"
        bodyClassName="pt-4"
      >
        {n > 0 ? (
          <>
            <p className="mb-3 text-xs leading-relaxed text-faint">
              Masked excerpts, cut to 300 characters by the backend. Retrieval similarity measures how close a passage
              is to the question, not how likely the answer is to be right.
            </p>
            <ul className="space-y-3">
              {response.sources.map((source, i) => (
                <motion.li
                  key={`${source.id}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.08 + i * 0.05 }}
                >
                  <SourceCard source={source} />
                </motion.li>
              ))}
            </ul>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-line px-4 py-3.5 text-sm leading-relaxed text-dim">
            {response.blocked
              ? "The input guard rejected this request, so nothing was retrieved."
              : "No sources were returned for this request. That alone doesn't say whether other documents exist."}
          </p>
        )}
      </CollapsibleSection>
    </motion.article>
  );
}
