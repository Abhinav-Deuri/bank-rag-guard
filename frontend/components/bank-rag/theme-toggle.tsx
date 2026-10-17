"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/bank-rag/theme-provider";
import { cn } from "@/lib/utils";

/**
 * Light / dark switch. The two icons swap with CSS keyed off <html data-theme>, so the right
 * one shows from first paint (no flash) and the swap animates; the label follows the state.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn(
        "relative grid size-10 shrink-0 place-items-center rounded-full text-dim outline-none transition-colors duration-150 ease-out",
        "hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <span className="relative block size-[1.15rem]" aria-hidden>
        <Sun
          className={cn(
            "absolute inset-0 size-full transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
            "[[data-theme=light]_&]:-rotate-90 [[data-theme=light]_&]:scale-50 [[data-theme=light]_&]:opacity-0",
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 size-full rotate-90 scale-50 opacity-0 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
            "[[data-theme=light]_&]:rotate-0 [[data-theme=light]_&]:scale-100 [[data-theme=light]_&]:opacity-100",
          )}
        />
      </span>
    </button>
  );
}
