import { AsciiBackdrop } from "@/components/bank-rag/landing/ascii-backdrop";
import { DemoCta } from "@/components/bank-rag/landing/demo-cta";
import { Reveal } from "@/components/bank-rag/landing/reveal";

export function FinalCta() {
  return (
    <section id="demo" aria-labelledby="demo-heading" className="relative isolate overflow-hidden border-t border-line-soft py-24 sm:py-32">
      <AsciiBackdrop variant="closing" />
      <Reveal className="mx-auto flex w-full max-w-3xl flex-col items-center gap-7 px-4 text-center sm:px-6">
        <h2 id="demo-heading" className="text-[clamp(2.2rem,5vw,3.75rem)]">
          Try the demo
        </h2>
        <p className="max-w-[32rem] text-[1.05rem] leading-relaxed text-dim">
          Choose a demo user, ask the same question as a teller and as a compliance officer, and compare what comes back.
        </p>
        <DemoCta>Open secure demo</DemoCta>
      </Reveal>
    </section>
  );
}
