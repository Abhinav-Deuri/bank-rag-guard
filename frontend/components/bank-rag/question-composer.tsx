"use client";

import { forwardRef } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_QUESTION_LENGTH } from "@/lib/api/types";
import { codePointLength, cn, truncateCodePoints } from "@/lib/utils";

interface QuestionComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  /** Reason the Ask button can't be used yet (no user, list failed, ...). */
  blockedReason: string | null;
  username: string | null;
  children?: React.ReactNode;
}

export const QuestionComposer = forwardRef<HTMLTextAreaElement, QuestionComposerProps>(function QuestionComposer(
  { value, onChange, onSubmit, loading, blockedReason, username, children },
  ref,
) {
  const count = codePointLength(value);
  const atLimit = count >= MAX_QUESTION_LENGTH;
  const empty = value.trim().length === 0;
  const disabled = loading || empty || blockedReason !== null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
      className="space-y-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="question" className="text-sm font-medium text-fg">
          Question
        </label>
        <span id="question-count" className={cn("num text-xs", atLimit ? "text-warn" : "text-faint")}>
          {count} / {MAX_QUESTION_LENGTH}
          {atLimit ? " · limit reached" : ""}
        </span>
      </div>

      <Textarea
        ref={ref}
        id="question"
        name="question"
        dir="auto"
        value={value}
        disabled={loading}
        onChange={(e) => onChange(truncateCodePoints(e.target.value, MAX_QUESTION_LENGTH))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (!disabled) onSubmit();
          }
        }}
        aria-describedby="question-hint question-count"
        placeholder="Ask about documents or customer cases, e.g. “What complaints involve disputed card transactions?”"
      />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <p id="question-hint" className="max-w-[34rem] text-xs leading-relaxed text-faint">
          Each question is answered on its own; the assistant has no memory of earlier ones. Personal data in your
          question is masked before it goes further.
        </p>
        <Button type="submit" variant="lime" size="md" loading={loading} disabled={disabled} className="min-w-40 rounded-full">
          {loading ? (
            "Asking…"
          ) : (
            <>
              <ArrowUp className="size-4" aria-hidden />
              Ask{username ? ` as ${username}` : " assistant"}
            </>
          )}
        </Button>
      </div>

      {blockedReason && !loading ? <p className="text-xs text-warn">{blockedReason}</p> : null}
      {children}
    </form>
  );
});
