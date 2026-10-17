"use client";

import { useTheme } from "@/components/bank-rag/theme-provider";
import GradientASCII from "@/components/ui/gradient-ascii";
import { cn } from "@/lib/utils";

/**
 * Decorative WebGL backdrop (React Bits GradientASCII). It sits behind content, is hidden
 * from assistive tech, pauses when off-screen, and holds a still frame under
 * prefers-reduced-motion. If WebGL2 is missing the canvas stays transparent and the page
 * keeps its plain page color.
 *
 * Configuration is hard-coded from the supplied usage example on purpose. In the light theme
 * the component's own `lightMode` draws the gradient as a wash with darker characters.
 */
const MONO = 'ui-monospace, "Cascadia Code", "SF Mono", Consolas, "Liberation Mono", monospace';

export function AsciiBackdrop({
  variant = "hero",
  className,
}: {
  variant?: "hero" | "closing";
  className?: string;
}) {
  const hero = variant === "hero";
  const light = useTheme().theme === "light";

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10", className)}>
      <GradientASCII
        shape={hero ? "horizon" : "rise"}
        colors={["#1e3fd8", "#f6f8ff", "#a5d8ff", "#38bdf8"]}
        characters=" =+xX0S8#@"
        cellSize={18}
        density={0.8}
        glyphOpacity={light ? 0.7 : 0.85}
        gradientOpacity={light ? 0.55 : 0.9}
        glow={light ? 0.1 : 0.2}
        flicker={0.2}
        softness={0.5}
        speed={1}
        grain={light ? 0.04 : 0.08}
        clickEffect="none"
        mouseInteraction
        lightMode={light}
        dpr={1.5}
        fontFamily={MONO}
      />
      {/* Light scrim: keeps the copy readable without hiding the effect. */}
      <div
        className={cn(
          "absolute inset-0",
          hero
            ? "bg-[radial-gradient(ellipse_60%_65%_at_24%_48%,rgb(var(--scrim-rgb)/0.62)_0%,rgb(var(--scrim-rgb)/0.28)_55%,transparent_100%)]"
            : "bg-[radial-gradient(ellipse_55%_50%_at_50%_58%,rgb(var(--scrim-rgb)/0.6)_0%,rgb(var(--scrim-rgb)/0.25)_60%,transparent_100%)]",
        )}
      />
      {/* Soft seam into the next section. */}
      <div
        className={cn(
          "absolute inset-x-0 h-40",
          hero
            ? "bottom-0 bg-gradient-to-b from-transparent to-bg"
            : "top-0 bg-gradient-to-t from-transparent to-bg",
        )}
      />
    </div>
  );
}
