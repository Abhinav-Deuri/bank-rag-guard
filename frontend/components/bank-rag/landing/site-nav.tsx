"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandWordmark } from "@/components/bank-rag/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/bank-rag/theme-toggle";
import { useTheme } from "@/components/bank-rag/theme-provider";
import GooeyNav from "@/components/ui/gooey-nav";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Overview", href: "#main" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Demo", href: "#demo" },
];

// Sections the links point at, in page order. Index 0 (Overview) is "above the first section".
const SECTION_IDS = ["how-it-works", "demo"];

/**
 * Floating pill nav. The wordmark, the GooeyNav link group (React Bits) and the primary
 * action share one glass pill, so they stay legible over the animated hero backdrop.
 * The active link follows the section in view (a simple scroll spy), and clicking a link
 * triggers the gooey transition while the browser scrolls to its anchor.
 */
export function SiteNav() {
  const [active, setActive] = useState(0);
  const { theme } = useTheme();
  const light = theme === "light";

  useEffect(() => {
    const spy = () => {
      let index = 0;
      SECTION_IDS.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) index = i + 1;
      });
      setActive(index);
    };
    spy();
    window.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("resize", spy);
    return () => {
      window.removeEventListener("scroll", spy);
      window.removeEventListener("resize", spy);
    };
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav
        aria-label="Primary"
        className="pointer-events-auto relative isolate mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-full py-2 pl-4 pr-2 sm:pl-5"
      >
        <span aria-hidden className="glass-pill" />
        <Link href="/" aria-label="Bank RAG Guard home" className="shrink-0 rounded-full">
          <BrandWordmark />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hidden on phones: the wordmark and the primary action are enough there. */}
          <div className="hidden sm:block">
            <GooeyNav
              items={ITEMS}
              activeIndex={active}
              onChange={(index) => setActive(index)}
              theme={light ? "light" : "dark"}
              size="md"
              frame={false}
              color={light ? "#0f1b34" : "#eaf1ff"}
              style={{
                "--gn-muted": light ? "rgba(15, 27, 52, 0.78)" : "rgba(244, 247, 255, 0.88)",
                "--gn-ink": light ? "#0f1b34" : "#f4f7ff",
              }}
              particleCount={15}
              spread={56}
              animationTime={600}
              timeVariance={300}
              gooeyness={0.5}
              wobble={0.5}
              hoverEffect
            />
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
