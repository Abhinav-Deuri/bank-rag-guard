"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/bank-rag/theme-provider";
import BorderGlow, { type BorderGlowProps } from "@/components/ui/border-glow";
import { cn } from "@/lib/utils";

interface ProximityGlowProps extends BorderGlowProps {
  /** How far outside the card's edge (px) the pointer can be and still light it. */
  range?: number;
}

/**
 * React Bits BorderGlow only reacts while the pointer is over the card: it listens on the
 * card itself, and its CSS hides every glow layer unless the card is :hover. This wrapper
 * extends that to the space around the card. While a mouse pointer is within `range` px of
 * the edge, it feeds the card the same `--edge-proximity` / `--cursor-angle` variables the
 * component computes and holds the glow layers open with the `sweep-active` class the
 * component already uses for its intro sweep. Over the card itself, BorderGlow takes over.
 * The vendored files stay untouched.
 */
export function ProximityGlow({ range = 80, className, ...glow }: ProximityGlowProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const light = useTheme().theme === "light";

  // BorderGlow reads its background as a hex color to decide how to blend, so the light theme
  // passes the exact light panel hex and a deeper blue that stays visible on white.
  const themed: Partial<BorderGlowProps> = light
    ? { backgroundColor: "#fcfdff", glowColor: "222 88 52", colors: ["#2563eb", "#0ea5e9", "#7dd3fc"] }
    : {};

  useEffect(() => {
    const card = hostRef.current?.firstElementChild as HTMLElement | null;
    // Touch screens have no hover, so there is nothing to track.
    if (!card || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const sensitivity = Number.parseFloat(card.style.getPropertyValue("--edge-sensitivity")) || 30;
    let pointer: { x: number; y: number } | null = null;
    let lit = false;

    const release = () => {
      if (!lit) return;
      lit = false;
      card.classList.remove("sweep-active");
    };

    const update = () => {
      if (!pointer) return release();
      const rect = card.getBoundingClientRect();
      const dx = Math.max(rect.left - pointer.x, 0, pointer.x - rect.right);
      const dy = Math.max(rect.top - pointer.y, 0, pointer.y - rect.bottom);
      const distance = Math.hypot(dx, dy);

      // Over the card: BorderGlow's own handler and :hover drive the glow.
      if (distance === 0 || distance > range) return release();

      // 100 at the edge, falling to the glow's own threshold (`sensitivity`) at `range`.
      const proximity = 100 - (distance / range) * (100 - sensitivity);
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let angle = (Math.atan2(pointer.y - cy, pointer.x - cx) * 180) / Math.PI + 90;
      if (angle < 0) angle += 360;

      card.style.setProperty("--edge-proximity", proximity.toFixed(3));
      card.style.setProperty("--cursor-angle", `${angle.toFixed(3)}deg`);
      lit = true;
      card.classList.add("sweep-active");
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer = { x: event.clientX, y: event.clientY };
      update();
    };
    const onLeaveWindow = () => {
      pointer = null;
      release();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeaveWindow);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", update);
      document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
      release();
    };
  }, [range]);

  return (
    <div ref={hostRef} className="flex w-full">
      <BorderGlow {...glow} {...themed} className={cn("w-full", className)} />
    </div>
  );
}
