"use client";

import Link from "next/link";
import { CircleHelp, House } from "lucide-react";
import { SECTIONS, type SectionId } from "@/components/bank-rag/dashboard/sections";
import { cn } from "@/lib/utils";

/**
 * Slim icon rail (large screens). It is `position: fixed` at the left edge of the dashboard frame, so
 * it stays visible wherever the page is scrolled. Each icon jumps to a section; the active one is a
 * filled circle. The grid keeps an empty column for it, so content never slides underneath.
 */
export function DashboardRail({ active, onSelect }: { active: SectionId; onSelect: (id: SectionId) => void }) {
  const item =
    "grid size-11 place-items-center rounded-full outline-none transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  return (
    <nav
      aria-label="Dashboard sections"
      // Left edge = the frame's left edge (page padding) + the frame's own padding, also when the frame is centered.
      className="hidden flex-col justify-between gap-6 lg:fixed lg:left-[max(3rem,calc((100%_-_1480px)/2_+_1.5rem))] lg:top-28 lg:z-30 lg:flex lg:h-[min(44rem,calc(100dvh_-_8rem))] lg:w-[3.75rem]"
    >
      <ul className="dash-card flex flex-col gap-2 self-start rounded-full p-2">
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const current = id === active;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelect(id);
                  if (id === "top") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    return;
                  }
                  const target = document.getElementById(id);
                  if (target) {
                    const navOffset = 96;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.scrollY - navOffset;
                    window.scrollTo({ top: Math.max(0, offsetPosition), behavior: "smooth" });
                  }
                }}
                aria-label={label}
                aria-current={current ? "true" : undefined}
                title={label}
                className={cn(item, current ? "bg-fg text-bg" : "text-dim hover:bg-inset hover:text-fg")}
              >
                <Icon className="size-[1.15rem]" aria-hidden />
              </a>
            </li>
          );
        })}
      </ul>
      <ul className="dash-card flex flex-col gap-2 self-start rounded-full p-2">
        <li>
          <Link
            href="/#how-it-works"
            aria-label="How it works"
            title="How it works"
            className={cn(item, "text-dim hover:bg-inset hover:text-fg")}
          >
            <CircleHelp className="size-[1.15rem]" aria-hidden />
          </Link>
        </li>
        <li>
          <Link
            href="/"
            aria-label="Back to overview"
            title="Back to overview"
            className={cn(item, "text-dim hover:bg-inset hover:text-fg")}
          >
            <House className="size-[1.15rem]" aria-hidden />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
