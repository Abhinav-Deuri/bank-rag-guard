"use client";

import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/components/bank-rag/theme-provider";

/**
 * Every Framer Motion animation honours the visitor's reduced-motion setting, and the whole
 * app can read and change the light / dark theme.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
