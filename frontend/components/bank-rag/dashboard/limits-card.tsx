import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * The plan-card slot of a dashboard, used for something true: the demo's request limits (from
 * app.py) and a pointer to how the pipeline works. No upsell.
 */
export function LimitsCard() {
  return (
    <section aria-labelledby="limits-title" className="dash-card p-5">
      <h2 id="limits-title" className="text-[1.6rem] font-semibold leading-tight tracking-tight">
        Demo limits
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-dim">
        Thirty questions a minute per visitor and 400 a day across the whole demo. Masked text is sent to outside model
        services here; hosting them on LinuxONE is the production goal.
      </p>
      <Button asChild variant="primary" size="lg" className="mt-5 w-full rounded-full">
        <Link href="/#how-it-works">See how it works</Link>
      </Button>
    </section>
  );
}
