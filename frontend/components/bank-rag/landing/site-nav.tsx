"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { BrandWordmark } from "@/components/bank-rag/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/bank-rag/theme-toggle";
import { useTheme } from "@/components/bank-rag/theme-provider";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Overview", href: "#main" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Demo", href: "#demo" },
];

// Sections the links point at, in page order. Index 0 (Overview) is "above the first section".
const SECTION_IDS = ["how-it-works", "demo"];

/**
 * Floating pill nav. The wordmark, the sliding glassmorphic link group and the primary
 * action share one glass pill, so they stay legible over the animated hero backdrop.
 * The active link follows the section in view (scroll spy) with a smooth sliding indicator,
 * and clicking a link smoothly scrolls to the section.
 */
export function SiteNav() {
  const [active, setActive] = useState(0);
  const { theme } = useTheme();
  const light = theme === "light";
  const isClickScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, index: number) => {
    e.preventDefault();
    setActive(index);
    isClickScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 900);

    if (href === "#main" || href === "#") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    const target = document.querySelector(href);
    if (target) {
      const navOffset = 84;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - navOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const spy = () => {
      if (isClickScrolling.current) return;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
      if (atBottom) {
        setActive(2);
        return;
      }

      let index = 0;
      SECTION_IDS.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.45) {
          index = i + 1;
        }
      });
      setActive(index);
    };
    spy();
    window.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("resize", spy);
    return () => {
      window.removeEventListener("scroll", spy);
      window.removeEventListener("resize", spy);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav
        aria-label="Primary"
        className="pointer-events-auto relative isolate mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-full py-2 pl-4 pr-2 sm:pl-5"
      >
        <span aria-hidden className="glass-pill" />
        <Link href="/" aria-label="AEGIS-Z home" className="shrink-0 rounded-full">
          <BrandWordmark />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hidden on phones: the wordmark and the primary action are enough there. */}
          <div className="hidden sm:block">
            <nav aria-label="Section links" className="relative flex items-center gap-1 rounded-full p-1">
              {ITEMS.map((item, index) => {
                const isActive = active === index;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href, index)}
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
                        layoutId="nav-glass-indicator"
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
                    <span className="relative z-10">{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>
          <ThemeToggle />
          <Link
            href="/workspace"
            className={cn(buttonVariants({ variant: "primary", size: "sm" }), "h-10 rounded-full px-4")}
          >
            Open demo
          </Link>
        </div>
      </nav>
    </header>
  );
}
