import { FinalCta } from "@/components/bank-rag/landing/final-cta";
import { Features } from "@/components/bank-rag/landing/features";
import { HowItWorks } from "@/components/bank-rag/landing/how-it-works";
import { SiteFooter } from "@/components/bank-rag/landing/site-footer";
import { SiteNav } from "@/components/bank-rag/landing/site-nav";
import { StaticHero } from "@/components/bank-rag/landing/static-hero";
import { Transparency } from "@/components/bank-rag/landing/transparency";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main id="main" className="flex-1">
        <StaticHero />
        <Features />
        <HowItWorks />
        <Transparency />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
