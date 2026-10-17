"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ProximityGlow } from "@/components/bank-rag/landing/proximity-glow";
import { StepVisual } from "@/components/bank-rag/landing/step-visuals";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STEPS = [
  { title: "Question", body: "A staff member asks a question as their demo user. The server looks up that user's role and clearance tier." },
  { title: "Guard and masking", body: "The input guard screens for injection attempts. Personal data in the question is masked." },
  { title: "Tier-filtered retrieval", body: "The tier rule runs inside the database query, so passages above the user's clearance are never retrieved." },
  { title: "Passage screening and masking", body: "Retrieved passages are checked for hidden instructions, then personal data is masked before the model sees them." },
  { title: "Answer and output masking", body: "The model answers from masked passages only, and the answer is masked again." },
  { title: "Audit", body: "Each step writes to a hash-chained log, which anyone can verify." },
];

/**
 * Section-scoped scroll story. Desktop only, and only when the visitor hasn't asked for
 * reduced motion: the section pins itself and scrubs through the six steps. Everywhere
 * else the same content is a plain vertical list. Native scrolling is never intercepted.
 */
export function HowItWorks() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const el = root.current;
        if (!el) return;
        const steps = gsap.utils.toArray<HTMLElement>("[data-step]", el);
        const panels = gsap.utils.toArray<HTMLElement>("[data-panel]", el);
        const rail = el.querySelector<HTMLElement>("[data-rail]");
        const stage = el.querySelector<HTMLElement>("[data-pin]");
        if (!stage || !rail || steps.length === 0) return;

        gsap.set(steps, { opacity: 0.42 });
        gsap.set(steps[0], { opacity: 1 });
        gsap.set(panels, { autoAlpha: 0 });
        gsap.set(panels[0], { autoAlpha: 1 });
        gsap.set(rail, { scaleY: 0, transformOrigin: "top" });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: stage,
            start: "top top+=88",
            end: `+=${steps.length * 55}%`,
            pin: true,
            scrub: 0.5,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        tl.to(rail, { scaleY: 1, duration: steps.length - 1 }, 0);
        for (let i = 1; i < steps.length; i += 1) {
          tl.to(panels[i - 1], { autoAlpha: 0, y: -18, duration: 0.3, ease: "power2.in" }, i - 0.3)
            .fromTo(panels[i], { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }, i - 0.05)
            .to(steps[i - 1], { opacity: 0.42, duration: 0.25 }, i - 0.2)
            .to(steps[i], { opacity: 1, duration: 0.25 }, i - 0.05);
        }
        tl.to({}, { duration: 0.6 }); // hold on the last step

        el.dataset.scrub = "on";
        return () => {
          delete el.dataset.scrub;
        };
      });
    },
    { scope: root },
  );

  return (
    <section
      id="how-it-works"
      ref={root}
      aria-labelledby="how-heading"
      className="border-t border-line-soft py-20 sm:py-28"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="how-heading" className="max-w-[20ch] text-[clamp(1.9rem,4vw,3rem)]">
          What happens to a question
        </h2>
        <p className="mt-4 max-w-[36rem] text-[0.95rem] leading-relaxed text-dim">
          This explains the architecture. It is not live request telemetry, and the examples are synthetic.
        </p>

        <div data-pin className="mt-12 grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:items-start">
          <ol className="relative space-y-7 lg:space-y-5 lg:pl-8">
            <span
              aria-hidden
              className="absolute bottom-2 left-[0.45rem] top-2 hidden w-px bg-line-soft lg:block"
            />
            <span
              aria-hidden
              data-rail
              className="absolute bottom-2 left-[0.45rem] top-2 hidden w-px bg-accent lg:block"
            />
            {STEPS.map((step, i) => (
              <li key={step.title} data-step className="relative">
                <span
                  aria-hidden
                  className="absolute -left-8 top-[0.42rem] hidden size-[0.95rem] rounded-full border border-line bg-bg lg:block"
                />
                <h3 className="text-lg font-medium">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-dim">{step.body}</p>
                {/* Inline visual: mobile and reduced motion. The pinned stage replaces it on desktop. */}
                <div className="mt-4 block lg:hidden motion-reduce:lg:block">
                  <StepVisual index={i} />
                </div>
              </li>
            ))}
          </ol>

          <div
            aria-hidden
            className="hidden lg:block motion-reduce:lg:hidden"
          >
            <ProximityGlow
              range={80}
              className="min-h-[22rem] border-line-soft!"
              edgeSensitivity={30}
              glowColor="215 85 72"
              backgroundColor="var(--ink-900)"
              borderRadius={20}
              glowRadius={56}
              glowIntensity={1.0}
              coneSpread={25}
              animated={false}
              colors={["#1e3fd8", "#38bdf8", "#a5d8ff"]}
            >
              <div className="relative min-h-[22rem] w-full flex-1 p-6">
                {STEPS.map((step, i) => (
                  <div
                    key={step.title}
                    data-panel
                    className={i === 0 ? "" : "invisible absolute inset-6 opacity-0"}
                  >
                    <StepVisual index={i} />
                  </div>
                ))}
              </div>
            </ProximityGlow>
          </div>
        </div>
      </div>
    </section>
  );
}
