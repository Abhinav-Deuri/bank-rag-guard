import { Lock, ShieldCheck } from "lucide-react";
import { MaskedText } from "@/components/bank-rag/masked-text";

/**
 * Code-native, clearly labelled illustration of the workspace. Every value here is
 * synthetic; none of it comes from the backend. It is the media that goes inside the
 * expanding hero panel, and the whole visual on mobile / reduced motion.
 */
export function HeroPreview({ className }: { className?: string }) {
  return (
    <figure className={className}>
      <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-[0_24px_60px_-24px_rgb(var(--shadow-rgb)/var(--shadow-a))]">
        <div className="flex items-center justify-between gap-3 border-b border-line-soft bg-raised/60 px-4 py-2.5">
          <span className="text-xs font-medium text-dim">Workspace · Demo environment</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-ok">
            <ShieldCheck className="size-3.5" aria-hidden />
            Chain intact
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-accent/40 bg-accent/12 px-2.5 py-0.5 font-medium text-accent">
              teller1 · Tier 1
            </span>
            <span className="text-faint">asked</span>
          </div>
          <p className="text-[0.95rem] leading-snug text-fg">What complaints involve disputed card transactions?</p>

          <div className="rounded-lg border border-line-soft bg-bg/60 p-3.5">
            <MaskedText
              className="text-sm leading-relaxed text-dim"
              text="Customer [NAME] disputed a charge of AED 1,240 on card [CARD]. Account [IBAN] was flagged for review and [NAME] was contacted on [PHONE]."
            />
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft text-xs">
            <div className="bg-panel p-3">
              <dt className="text-faint">Masked in passages</dt>
              <dd className="num mt-1 font-mono text-dim">NAME × 3 · IBAN × 2</dd>
            </div>
            <div className="bg-panel p-3">
              <dt className="text-faint">Sources</dt>
              <dd className="num mt-1 text-dim">3 returned · all ≤ Tier 1</dd>
            </div>
          </dl>

          <ul className="space-y-2 text-xs">
            {[
              ["synthetic_customer_notes", "811", "0.812"],
              ["synthetic_customer_notes", "90", "0.781"],
            ].map(([name, id, score]) => (
              <li key={id} className="flex items-center justify-between gap-3 rounded-md border border-line-soft px-3 py-2">
                <span className="truncate text-dim">{name}</span>
                <span className="num shrink-0 text-faint">
                  #{id} · Tier 1 · {score}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 rounded-md border border-dashed border-line px-3 py-2 text-faint">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-3.5" aria-hidden />
                Tier 2–3 contracts
              </span>
              <span>not retrieved for this user</span>
            </li>
          </ul>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-faint">
        Illustrative preview with synthetic content, not live output.
      </figcaption>
    </figure>
  );
}
