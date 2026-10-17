import { Ban, CircleCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AskResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function Cell({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2 bg-panel p-4", className)}>
      <dt className="text-xs font-medium text-faint">{label}</dt>
      <dd className="space-y-1.5 text-sm text-fg">{children}</dd>
    </div>
  );
}

/**
 * Only what the response itself says: tier, blocked flag, masking counts exactly as
 * returned, and the number of sources. The tier check is computed here from the
 * response and labelled that way.
 */
export function SecuritySummary({ response }: { response: AskResponse }) {
  const counts = Object.entries(response.masked_in_context);
  const answerCounts = Object.entries(response.masked_in_answer ?? {});
  const dropped = response.dropped_passages ?? 0;
  const learned = response.learned_attacks_count ?? 0;
  const above = response.sources.filter((s) => s.tier > response.tier);
  const n = response.sources.length;

  return (
    <dl className="grid gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft sm:grid-cols-2">
      <Cell label="Identity applied by the server">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{response.username}</span>
          <Badge tone="accent" className="num">
            Tier {response.tier}
          </Badge>
        </p>
      </Cell>

      <Cell label="Input guard & self-healing memory">
        {response.blocked ? (
          <p className="flex items-center gap-2 font-medium text-bad">
            <Ban className="size-4 shrink-0" aria-hidden />
            Blocked by input guard
          </p>
        ) : (
          <p className="flex items-center gap-2 text-ok">
            <CircleCheck className="size-4 shrink-0" aria-hidden />
            Question allowed through
          </p>
        )}
        <p className="text-xs leading-relaxed text-faint">
          {learned > 0
            ? `Self-healing guard active (${learned} blocked attack pattern${learned === 1 ? "" : "s"} in memory).`
            : "Self-healing guard active (learns from blocked attacks in audit_log)."}
        </p>
      </Cell>

      <Cell label="Masked in retrieved passages (as reported)">
        {counts.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {counts.map(([label, value]) => (
              <li key={label}>
                <Badge tone="accent" className="num font-mono">
                  {label} × {value}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-dim">No masking matches reported</p>
        )}
        {answerCounts.length > 0 ? (
          <p className="text-xs leading-relaxed text-ok">
            Second-pass output safety net also masked:{" "}
            {answerCounts.map(([k, v]) => `${k} × ${v}`).join(", ")}.
          </p>
        ) : null}
        <p className="text-xs leading-relaxed text-faint">
          Checksum-verified PII (IBAN, Emirates ID, Card) plus bilingual EN/AR contextual & gazetteer name masking.
          {response.blocked ? " This request was stopped before any retrieval." : ""}
        </p>
      </Cell>

      <Cell label="Sources returned & passage screen">
        <p className="num font-medium">{n}</p>
        {dropped > 0 ? (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-warn">
            <Ban className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {dropped} poisoned passage{dropped === 1 ? "" : "s"} dropped by indirect-injection screen
          </p>
        ) : null}
        {n > 0 ? (
          above.length === 0 ? (
            <p className="flex items-start gap-2 text-xs leading-relaxed text-ok">
              <CircleCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              All {n} at or below Tier {response.tier} (checked here from the response)
            </p>
          ) : (
            <p className="flex items-start gap-2 text-xs leading-relaxed text-bad">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {above.length} source{above.length === 1 ? "" : "s"} above Tier {response.tier}. This should not happen;
              report it.
            </p>
          )
        ) : (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-faint">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            None returned for this request
          </p>
        )}
      </Cell>
    </dl>
  );
}
