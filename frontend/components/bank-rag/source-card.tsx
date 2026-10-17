import { Badge } from "@/components/ui/badge";
import { MaskedText } from "@/components/bank-rag/masked-text";
import type { SourceChunk } from "@/lib/api/types";

export function SourceCard({ source }: { source: SourceChunk }) {
  return (
    <article className="rounded-lg border border-line-soft bg-raised/50 p-4">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h4 dir="auto" className="min-w-0 text-sm font-medium text-fg [overflow-wrap:anywhere]">
          {source.source}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          <Badge className="num">Chunk #{source.id}</Badge>
          <Badge tone="accent" className="num">
            Tier {source.tier}
          </Badge>
        </div>
      </header>
      <p className="mt-1.5 text-xs text-faint">
        Retrieval similarity <span className="num font-medium text-dim">{source.score.toFixed(3)}</span>
      </p>
      <MaskedText text={source.text} className="mt-3 text-sm leading-relaxed text-dim" />
    </article>
  );
}
