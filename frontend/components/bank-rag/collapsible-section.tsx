"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Collapsible below `lg`, always open from `lg` up. The two headings are swapped
 * with CSS only, so there is no layout flash and no JS media query.
 */
export function CollapsibleSection({
  title,
  count,
  summary,
  defaultOpen = true,
  headingLevel: Heading = "h3",
  children,
  className,
  headerClassName,
  bodyClassName,
}: {
  title: string;
  count?: number;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  headingLevel?: "h2" | "h3";
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  const label = (
    <>
      {title}
      {typeof count === "number" ? <span className="num ml-2 font-normal text-faint">{count}</span> : null}
    </>
  );

  return (
    <section aria-label={title} className={className}>
      <div className={cn("hidden items-center justify-between gap-3 lg:flex", headerClassName)}>
        <Heading className="text-base font-medium text-fg">{label}</Heading>
        {summary}
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-md text-left lg:hidden",
          headerClassName,
        )}
      >
        <span className="text-base font-medium text-fg">{label}</span>
        <span className="flex items-center gap-2">
          {summary}
          <ChevronDown
            aria-hidden
            className={cn("size-5 text-faint transition-transform duration-200 ease-out", open && "rotate-180")}
          />
        </span>
      </button>

      <div id={panelId} className={cn(open ? "block" : "hidden", "lg:block", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
