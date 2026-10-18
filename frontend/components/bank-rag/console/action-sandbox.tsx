"use client";

import { useState } from "react";
import { executeSandboxAction } from "@/lib/api/client";
import type { ProposedAction } from "@/lib/api/types";
import { ShieldAlert, ShieldCheck, Play, CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function ActionSandboxPanel({
  actions,
  currentUsername,
  currentUserTier,
  onExecuted,
}: {
  actions: ProposedAction[];
  currentUsername: string;
  currentUserTier: number;
  onExecuted: () => void;
}) {
  const [items, setItems] = useState<ProposedAction[]>(actions);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  if (!items.length) return null;

  const handleExecute = async (action: ProposedAction) => {
    setBusyId(action.id);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[action.id];
      return next;
    });
    try {
      const updated = await executeSandboxAction({
        action_id: action.id,
        username: currentUsername,
      });
      setItems((prev) => prev.map((a) => (a.id === action.id ? updated : a)));
      onExecuted();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [action.id]: err instanceof Error ? err.message : "Action execution blocked by sandbox.",
      }));
      onExecuted();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="mt-4 rounded-xl border border-line-soft bg-surface/50 p-3.5 space-y-2.5 max-w-[64ch]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-fg">
          <ShieldCheck className="size-4 text-accent" />
          <span>Stage 5.5 · Deterministic Action Sandbox (Transaction Guard)</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
          Pivot 3 · Provenance Enforced
        </span>
      </div>

      <div className="space-y-2">
        {items.map((act) => {
          const isExecuted = act.status === "executed";
          const isBlockedProv = !act.provenance_ok || act.status === "blocked_provenance";
          const canClearance = currentUserTier >= act.required_tier;
          const errMsg = errors[act.id];

          return (
            <div
              key={act.id}
              className={cn(
                "rounded-lg border p-3 text-xs transition-colors",
                isBlockedProv
                  ? "border-bad/40 bg-bad/10"
                  : isExecuted
                    ? "border-ok/40 bg-ok/10"
                    : "border-line bg-bg/70",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-accent">{act.action_type}</span>
                  <span className="rounded border border-line-soft bg-surface px-1.5 py-0.5 font-mono text-[10px] text-dim">
                    Target: {act.target_token}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
                      isBlockedProv
                        ? "bg-bad/20 text-bad"
                        : "bg-ok/15 text-ok",
                    )}
                  >
                    {isBlockedProv ? "POISONED CONTEXT BLOCKED" : "USER PROVENANCE VERIFIED"}
                  </span>
                  <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-faint">
                    Req Tier {act.required_tier}+
                  </span>
                </div>
              </div>

              <div className="mt-1.5 font-medium text-fg">{act.title}</div>
              <p className="mt-0.5 text-dim leading-relaxed">{act.description}</p>

              {errMsg && (
                <p className="mt-1.5 text-[11px] font-medium text-bad">{errMsg}</p>
              )}

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line-soft/60">
                <span className="font-mono text-[11px] text-faint">
                  {isExecuted
                    ? `Executed by ${act.executed_by} · ${act.receipt ?? "Logged to SHA-256"}`
                    : act.system ?? "IBM watsonx Orchestrate"}
                </span>

                {isExecuted ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-ok">
                    <CheckCircle2 className="size-3.5" />
                    Committed to Ledger
                  </span>
                ) : isBlockedProv ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-bad">
                    <ShieldAlert className="size-3.5" />
                    Sandbox Aborted
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === act.id}
                    onClick={() => handleExecute(act)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer",
                      canClearance
                        ? "bg-accent text-bg hover:bg-accent/90"
                        : "border border-warn/50 bg-warn/15 text-warn hover:bg-warn/25",
                    )}
                    title={
                      canClearance
                        ? `Authorize & execute ${act.action_type} as ${currentUsername}`
                        : `${currentUsername} is Tier ${currentUserTier} (Requires Tier ${act.required_tier}+). Click to test sandbox tier gate.`
                    }
                  >
                    {canClearance ? <Play className="size-3" /> : <Lock className="size-3" />}
                    {busyId === act.id
                      ? "Executing…"
                      : canClearance
                        ? `Authorize & Execute (${currentUsername})`
                        : `Test Tier Gate (${currentUsername} · Tier ${currentUserTier})`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
