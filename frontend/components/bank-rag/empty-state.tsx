import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 rounded-xl border border-dashed border-line px-5 py-6", className)}>
      {icon ? <span className="text-faint [&_svg]:size-6">{icon}</span> : null}
      <div className="max-w-prose space-y-1.5">
        <h3 className="text-base font-medium text-fg">{title}</h3>
        {children ? <div className="text-sm leading-relaxed text-dim">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}
