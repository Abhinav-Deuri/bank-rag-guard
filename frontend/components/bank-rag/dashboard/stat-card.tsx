import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const HINT_TONES = {
  muted: "text-faint",
  ok: "text-ok",
  bad: "text-bad",
  warn: "text-warn",
} as const;

/** Small metric tile: tinted icon, label, big value and one line of context. Values come from the API. */
export function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  hintTone = "muted",
  loading = false,
}: {
  icon: LucideIcon;
  /** Any CSS color; tints the icon circle. */
  tone: string;
  label: string;
  value: React.ReactNode;
  hint: React.ReactNode;
  hintTone?: keyof typeof HINT_TONES;
  loading?: boolean;
}) {
  return (
    <div className="dash-card flex min-w-0 flex-col justify-between gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          style={{ "--tone": tone } as CSSProperties}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--tone)_16%,transparent)] text-[var(--tone)]"
        >
          <Icon className="size-4" />
        </span>
        <span className="truncate text-sm text-dim">{label}</span>
      </div>
      <div className="min-w-0 space-y-1.5">
        {loading ? (
          <>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3.5 w-32" />
          </>
        ) : (
          <>
            <p className="num truncate text-[1.6rem] font-semibold leading-none tracking-tight text-fg">{value}</p>
            <p className={cn("line-clamp-2 text-xs leading-snug", HINT_TONES[hintTone])}>{hint}</p>
          </>
        )}
      </div>
    </div>
  );
}
