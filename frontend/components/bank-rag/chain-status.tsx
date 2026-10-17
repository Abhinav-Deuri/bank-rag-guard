import { CircleHelp, LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChainState = "loading" | "intact" | "broken" | "unknown";

/** An error while checking is "unknown", never "intact". */
export function deriveChain(data: { ok: boolean } | null, error: unknown): ChainState {
  return error ? "unknown" : data ? (data.ok ? "intact" : "broken") : "loading";
}

const COPY: Record<ChainState, { label: string; tone: string; Icon: typeof ShieldCheck }> = {
  loading: { label: "Checking chain…", tone: "border-line text-dim", Icon: LoaderCircle },
  intact: { label: "Chain intact", tone: "border-ok/45 bg-ok/8 text-ok", Icon: ShieldCheck },
  broken: { label: "Chain broken", tone: "border-bad/50 bg-bad/10 text-bad", Icon: ShieldAlert },
  unknown: { label: "Chain status unknown", tone: "border-warn/45 bg-warn/8 text-warn", Icon: CircleHelp },
};

/** An error while checking is "unknown", never "intact". */
export function ChainStatus({ state, message, compact = false }: { state: ChainState; message?: string; compact?: boolean }) {
  const { label, tone, Icon } = COPY[state];

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", tone)}>
        <Icon className={cn("size-3.5", state === "loading" && "animate-spin motion-reduce:animate-none")} aria-hidden />
        {label}
      </span>
    );
  }

  return (
    <div role="status" className={cn("rounded-lg border px-4 py-3.5", tone)}>
      <p className="flex items-center gap-2 text-sm font-medium">
        <Icon className={cn("size-[1.1rem]", state === "loading" && "animate-spin motion-reduce:animate-none")} aria-hidden />
        {label}
      </p>
      {message ? <p className="mt-1.5 text-sm leading-relaxed text-dim [overflow-wrap:anywhere]">{message}</p> : null}
    </div>
  );
}
