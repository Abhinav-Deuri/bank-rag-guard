"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Shield } from "lucide-react";
import { Avatar } from "@/components/bank-rag/dashboard/avatar";
import { SECTIONS, TAB_IDS, type SectionId } from "@/components/bank-rag/dashboard/sections";
import { ConnectionStatus } from "@/components/bank-rag/connection-status";
import { useTheme } from "@/components/bank-rag/theme-provider";
import { ThemeToggle } from "@/components/bank-rag/theme-toggle";
import type { HealthState } from "@/hooks/use-health";
import { cn } from "@/lib/utils";

/**
 * Floating top bar (a centered glass pill, like the landing nav). It is `position: fixed`, so it
 * stays on screen wherever the page is scrolled. Its measured height is published as
 * `--dash-bar-h` so the page can leave room for it.
 *
 * The tabs use a classic sliding glassmorphic indicator matching the landing page.
 */
export function DashboardTopbar({
  health,
  onRecheck,
  active,
  onSelect,
  username,
}: {
  health: HealthState;
  onRecheck: () => void;
  active: SectionId;
  onSelect: (id: SectionId) => void;
  username: string | null;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const light = useTheme().theme === "light";
  const tabs = SECTIONS.filter((s) => TAB_IDS.includes(s.id));
  const tabActive: SectionId = active;

  const handleTabClick = (e: React.MouseEvent<HTMLAnchorElement>, id: SectionId) => {
    e.preventDefault();
    onSelect(id);

    if (id === "top") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    const target = document.getElementById(id);
    if (target) {
      const navOffset = 96;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - navOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const measure = () => root.style.setProperty("--dash-bar-h", `${Math.ceil(bar.getBoundingClientRect().height) + 4}px`);
    const onScroll = () => setScrolled(window.scrollY > 12);
    measure();
    onScroll();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      root.style.removeProperty("--dash-bar-h");
    };
  }, []);

  return (
    <header
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-40 px-2 transition-[padding] duration-200 ease-out sm:px-4 lg:px-6",
        scrolled ? "pt-2 sm:pt-3" : "pt-3 sm:pt-6 lg:pt-8",
      )}
    >
      {/*
        Same centered glass pill as the landing page nav: the glass is its own layer behind the content
        (`isolate` + `.glass-pill`), the pill is capped at max-w-5xl, and it is fully round from `md` up.
        On phones it wraps to two rows, so it keeps softer corners there.
      */}
      <div
        ref={barRef}
        className="pointer-events-auto relative isolate mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2.5 rounded-[1.75rem] px-3 py-2 sm:pl-4 md:grid md:grid-cols-[1fr_auto_1fr] md:flex-nowrap md:rounded-full md:pr-2"
      >
        <span aria-hidden className="glass-pill" />

        <Link
          href="/"
          aria-label="Bank RAG Guard overview"
          className="flex items-center gap-2.5 justify-self-start rounded-full"
        >
          <span aria-hidden className="relative grid size-10 place-items-center rounded-xl bg-accent text-bg shadow-sm">
            <Shield className="absolute size-[1.6rem]" strokeWidth={1.5} />
            <FileText className="relative size-3.5" strokeWidth={2} />
          </span>
          <span className="whitespace-nowrap text-[1.05rem] font-semibold tracking-tight">Bank RAG Guard</span>
        </Link>

        {/* md and up: sliding glassmorphic tabs matching landing page */}
        <div role="group" aria-label="Dashboard tabs" className="hidden md:block md:justify-self-center">
          <nav aria-label="Dashboard sections" className="relative flex items-center gap-1 rounded-full p-1">
            {tabs.map(({ id, label }) => {
              const isActive = id === tabActive;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => handleTabClick(e, id)}
                  className={cn(
                    "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isActive
                      ? light
                        ? "text-white font-semibold"
                        : "text-[#0a1226] font-semibold"
                      : light
                        ? "text-slate-700 hover:text-slate-950 hover:bg-black/5"
                        : "text-fg-dim hover:text-fg hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="dash-topbar-glass-indicator"
                      className={cn(
                        "absolute inset-0 rounded-full backdrop-blur-md",
                        light
                          ? "bg-[#0f1b34] border border-white/20 shadow-[0_2px_8px_rgba(15,27,52,0.18),inset_0_1px_1px_rgba(255,255,255,0.25)]"
                          : "bg-white/90 border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.25),0_1px_3px_rgba(0,0,0,0.1),inset_0_1px_1px_#ffffff]"
                      )}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Phones: a plain scrolling row */}
        <nav aria-label="Dashboard tabs" className="order-3 w-full overflow-x-auto md:hidden [scrollbar-width:none]">
          <ul className="mx-auto flex w-max gap-1 rounded-full bg-inset/70 p-1">
            {tabs.map(({ id, label }) => {
              const current = id === tabActive;
              return (
                <li key={id} className="relative">
                  <a
                    href={`#${id}`}
                    onClick={(e) => handleTabClick(e, id)}
                    aria-current={current ? "true" : undefined}
                    className={cn(
                      "relative z-10 block rounded-full px-4 py-1.5 text-sm font-medium outline-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                      current
                        ? light
                          ? "text-white font-semibold"
                          : "text-[#0a1226] font-semibold"
                        : "text-dim hover:text-fg",
                    )}
                  >
                    {current ? (
                      <motion.span
                        layoutId="dash-tab-mobile"
                        aria-hidden
                        transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
                        className={cn(
                          "absolute inset-0 -z-10 rounded-full backdrop-blur-md",
                          light
                            ? "bg-[#0f1b34] border border-white/20 shadow-sm"
                            : "bg-white/90 border border-white/60 shadow-sm"
                        )}
                      />
                    ) : null}
                    <span className="relative z-10">{label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 justify-self-end sm:gap-2">
          <ConnectionStatus health={health} onRecheck={onRecheck} />
          <ThemeToggle />
          {username ? (
            <Avatar name={username} ring className="size-10" />
          ) : (
            <span aria-hidden className="size-10 rounded-full bg-inset" />
          )}
        </div>
      </div>
    </header>
  );
}
