import { CircleAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Errors name the problem and the recovery. Amber = limit or uncertain, red = failed. */
export function ErrorState({
  title,
  children,
  tone = "bad",
  action,
  className,
  live = true,
}: {
  title: string;
  children?: React.ReactNode;
  tone?: "bad" | "warn";
  action?: React.ReactNode;
  className?: string;
  live?: boolean;
}) {
  const Icon = tone === "bad" ? CircleAlert : TriangleAlert;
  return (
    <div
      role={live ? "alert" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3.5",
        tone === "bad" ? "border-bad/45 bg-bad/8" : "border-warn/45 bg-warn/8",
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", tone === "bad" ? "text-bad" : "text-warn")} aria-hidden />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-medium text-fg">{title}</p>
        {children ? <div className="text-sm leading-relaxed text-dim">{children}</div> : null}
        {action ? <div className="pt-1.5">{action}</div> : null}
      </div>
    </div>
  );
}
