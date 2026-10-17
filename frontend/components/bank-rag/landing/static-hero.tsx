"use client";

import { motion } from "framer-motion";
import { AsciiBackdrop } from "@/components/bank-rag/landing/ascii-backdrop";
import { DemoCta } from "@/components/bank-rag/landing/demo-cta";
import { HeroPreview } from "@/components/bank-rag/landing/hero-preview";
import { useTheme } from "@/components/bank-rag/theme-provider";
import DecryptedText from "@/components/ui/decrypted-text";
import { ArrowDown } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;
const HEADLINE = "Secure answers start before the model.";
// Same words with fixed line breaks, so the scrambled glyphs (no kerning) wrap exactly like the
// settled text and the layout doesn't jump when the headline finishes decrypting.
const HEADLINE_LINES = "Secure answers\nstart before\nthe model.";

/**
 * Static hero. It is the complete hero on mobile and under reduced motion, and the
 * fallback for the scroll-expansion hero on desktop once that component is integrated.
 */
export function StaticHero() {
  const light = useTheme().theme === "light";
  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden">
      <AsciiBackdrop variant="hero" />
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-20 pt-28 sm:px-6 sm:pt-32 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-36">
        <div>
          <h1
            id="hero-heading"
            className="max-w-[18ch] text-[clamp(2.6rem,6.4vw,5rem)] font-medium leading-[1.04] tracking-[-0.035em]"
          >
            {/*
              DecryptedText (React Bits): the headline decrypts from the same characters the
              ASCII backdrop uses. Under reduced motion the plain text is shown instead (CSS
              swap, so there is no flash). The component keeps the real text for screen readers.
            */}
            <span className="motion-reduce:hidden">
              <DecryptedText
                text={HEADLINE_LINES}
                animateOn="inViewHover"
                effect="scramble"
                sequential
                revealDirection="start"
                speed={45}
                maxIterations={10}
                hoverRadius={100}
                scrambleColor={light ? "#1e3fd8" : "#a5d8ff"}
                loop={false}
                loopDelay={2000}
                useOriginalCharsOnly={false}
                characters="=+xX0S8#@"
              />
            </span>
            <span className="hidden motion-reduce:inline">{HEADLINE}</span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            className="mt-6 max-w-[34rem] text-lg leading-relaxed text-dim"
          >
            Explore a bank document assistant with tier-based retrieval, bilingual personal-data masking, and a
            tamper-evident audit trail.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
            className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4"
          >
            <DemoCta>Open secure demo</DemoCta>
            <a
              href="#how-it-works"
              className="group inline-flex min-h-11 items-center gap-2 text-[0.95rem] text-dim transition-colors hover:text-fg"
            >
              See how it works
              <ArrowDown className="size-4 transition-transform duration-200 ease-out group-hover:translate-y-0.5 motion-reduce:transition-none" aria-hidden />
            </a>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-12 text-sm text-faint"
          >
            Access-controlled answers. Masked personal data. Verifiable audit trails.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
        >
          <HeroPreview />
        </motion.div>
      </div>
    </section>
  );
}
