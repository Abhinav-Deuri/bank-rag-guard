import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Primary "open the demo" call to action.
 *
 * INTERIM: this is a plain pill link. The required visual is the supplied ShinyButton
 * (components/ui/shiny-button.tsx), which has not been provided yet. When it is, render
 * it here so the hero and the closing section pick it up in one place.
 */
export function DemoCta({
  children = "Open secure demo",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href="/workspace"
      className={cn(
        "group inline-flex h-12 items-center gap-2.5 rounded-full bg-accent px-6 text-[0.95rem] font-medium text-bg transition-[background-color,transform] duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--accent)_88%,white)] active:scale-[0.98] motion-reduce:active:scale-100",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
    </Link>
  );
}
