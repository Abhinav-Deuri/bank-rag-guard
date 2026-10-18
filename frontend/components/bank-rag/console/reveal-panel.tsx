"use client";

import { useState } from "react";
import { decideReveal, fetchRevealValue, requestReveal } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { RevealListing, RevealRequestRow } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { splitToken } from "./redacted";

export interface RevealDraft {
  answerId: number;
  token: string;
  askedAt: string;
}

function tokenLabel(token: string) {
  const { base, n } = splitToken(token);
  const word = base === "EMIRATES_ID" ? "Emirates ID" : base === "NAME" ? "name" : base.replace(/_/g, " ");
  return n ? `${word} ${n}` : word;
}

function statusText(r: RevealRequestRow) {
  switch (r.status) {
    case "pending":
      return "Waiting for a second person to approve";
    case "approved":
      return `Approved by ${r.approver}`;
    case "denied":
      return `Denied by ${r.approver}`;
    case "revealed":
      return "Shown once";
    case "expired":
      return "Approval expired";
  }
}

const message = (e: unknown) => (e instanceof ApiError ? e.message : "Something unexpected happened.");

export function RevealPanel({
  username,
  listing,
  draft,
  onCancelDraft,
  onChanged,
  onRevealed,
  values,
}: {
  username: string;
  listing: RevealListing;
  draft: RevealDraft | null;
  onCancelDraft: () => void;
  onChanged: () => void;
  onRevealed: (answerId: number, token: string, value: string) => void;
  values: Record<string, string>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
      onChanged();
    }
  };

  const submit = () =>
    draft &&
    run("request", async () => {
      await requestReveal({ username, answer_id: draft.answerId, token: draft.token, reason });
      setReason("");
      onCancelDraft();
    });

  return (
    <section aria-labelledby="reveal-h" className="border-b border-line px-4 py-5 sm:px-6">
      <h2 id="reveal-h" className="text-[15px] font-medium tracking-normal">
        Reveal requests
      </h2>
      <p className="mt-1 text-[13px] text-dim">
        {listing.can_request
          ? "Select a numbered bar in one of your answers to ask for the real value. A second person must approve, and you see it once."
          : "Colleagues asking to see one masked value. You can't approve your own requests."}
      </p>

      {draft && (
        <form
          className="mt-3 rounded border border-accent/50 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p className="text-sm">
            Reveal <span className="font-ledger">{tokenLabel(draft.token)}</span> from your answer at {draft.askedAt}
          </p>
          <label htmlFor="reveal-reason" className="mt-2 block text-[13px] text-dim">
            Reason, such as the case or alert number
          </label>
          <textarea
            id="reveal-reason"
            rows={2}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full resize-y rounded border border-line bg-bg px-2.5 py-2 text-sm text-fg"
          />
          <div className="mt-2 flex gap-3">
            <button
              type="submit"
              disabled={busy !== null || reason.trim().length < 10}
              className="rounded bg-accent px-3.5 py-1.5 text-sm font-medium text-bg disabled:opacity-50"
            >
              Send request
            </button>
            <button type="button" onClick={onCancelDraft} className="text-sm text-dim hover:text-fg">
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[13px] text-bad">
          {error}
        </p>
      )}

      {listing.to_decide.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[13px] text-faint">Waiting for your decision</h3>
          <ul className="mt-1.5">
            {listing.to_decide.map((r) => (
              <li key={r.id} className="border-t border-line-soft py-2.5 text-sm">
                <p>
                  <span className="font-medium">{r.requester}</span> asks to see{" "}
                  <span className="font-ledger">{tokenLabel(r.token)}</span>{" "}
                  <span className="num text-faint">(answer #{r.answer_id})</span>
                </p>
                <p className="mt-0.5 text-[13px] text-dim">“{r.reason}”</p>
                <div className="mt-1.5 flex gap-4 text-[13px]">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void run(`a${r.id}`, async () => void (await decideReveal({ username, request_id: r.id, approve: true })))}
                    className="font-medium text-accent underline underline-offset-4 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void run(`d${r.id}`, async () => void (await decideReveal({ username, request_id: r.id, approve: false })))}
                    className="text-dim underline underline-offset-4 hover:text-fg disabled:opacity-50"
                  >
                    Deny
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {listing.mine.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[13px] text-faint">Your requests</h3>
          <ul className="mt-1.5">
            {listing.mine.map((r) => {
              const shown = values[`${r.answer_id}:${r.token}`];
              return (
                <li key={r.id} className="border-t border-line-soft py-2.5 text-sm">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span>
                      <span className="font-ledger">{tokenLabel(r.token)}</span>{" "}
                      <span className="num text-faint">answer #{r.answer_id}</span>
                    </span>
                    <span className={cn("text-[13px]", r.status === "denied" || r.status === "expired" ? "text-bad" : r.status === "approved" ? "text-ok" : "text-dim")}>
                      {statusText(r)}
                    </span>
                  </p>
                  {r.status === "approved" && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        void run(`v${r.id}`, async () => {
                          const value = await fetchRevealValue({ username, request_id: r.id });
                          onRevealed(r.answer_id, r.token, value);
                        })
                      }
                      className="mt-1.5 rounded border border-accent px-3 py-1 text-[13px] font-medium text-accent disabled:opacity-50"
                    >
                      Show value once
                    </button>
                  )}
                  {shown && (
                    <p className="mt-1 font-ledger text-[13px] text-fg" dir="ltr">
                      {shown}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
