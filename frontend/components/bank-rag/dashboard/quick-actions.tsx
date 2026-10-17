"use client";

import { Eraser, RefreshCw, SquarePen, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Tile({
  icon: Icon,
  label,
  onClick,
  disabled,
  spinning,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border border-line-soft bg-bg/50 px-2 py-3.5 text-[0.8rem] font-medium text-dim outline-none transition-[background-color,color,border-color] duration-150 ease-out",
        "hover:border-line hover:bg-inset/60 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <Icon className={cn("size-[1.15rem] text-fg", spinning && "animate-spin motion-reduce:animate-none")} aria-hidden />
      {label}
    </button>
  );
}

export function QuickActions({
  onNew,
  onRefreshAudit,
  onClear,
  refreshing,
  canClear,
}: {
  onNew: () => void;
  onRefreshAudit: () => void;
  onClear: () => void;
  refreshing: boolean;
  canClear: boolean;
}) {
  return (
    <section aria-labelledby="quick-action-title" className="dash-card p-4 sm:p-5">
      <h2 id="quick-action-title" className="text-base font-semibold">
        Quick action
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Tile icon={SquarePen} label="New question" onClick={onNew} />
        <Tile icon={RefreshCw} label="Audit" onClick={onRefreshAudit} disabled={refreshing} spinning={refreshing} />
        <Tile icon={Eraser} label="Clear" onClick={onClear} disabled={!canClear} />
      </div>
    </section>
  );
}
