import { Reveal } from "@/components/bank-rag/landing/reveal";

const ITEMS = [
  {
    term: "Demo identities have no password",
    detail:
      "The user selector switches between demo identities. It isn't a sign-in. A real deployment would use the bank's single sign-on.",
  },
  {
    term: "The data is synthetic or public",
    detail:
      "Customer records are generated. Some documents, such as contracts and emails, come from public datasets. The tiers are labels assigned for testing, not real clearances.",
  },
  {
    term: "Bilingual masking + SQL tier isolation",
    detail:
      "Checksums and currency-aware regexes handle IBANs, Emirates IDs, cards, PINs and phone numbers, while English and Arabic names use Unicode normalization, compound prefixes (عبد / آل / Al-), honorifics, and bilingual gazetteers. Crucially, access control never relies on masking alone: restricted text is filtered inside SQL before retrieval.",
  },
  {
    term: "Masked text uses outside services in this demo",
    detail:
      "Masked questions and passages are sent to Jina for embeddings and Groq for the language model. Hosting both models on the same LinuxONE system is the production goal, not today's setup.",
  },
  {
    term: "A hash chain is tamper-evident, not tamper-proof",
    detail:
      "Editing or removing an entry in the middle of the log is detected. Someone with database superuser rights could still remove the newest entries without breaking the chain.",
  },
];

export function Transparency() {
  return (
    <section aria-labelledby="transparency-heading" className="border-t border-line-soft py-20 sm:py-28">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20 lg:px-8">
        <Reveal>
          <h2 id="transparency-heading" className="text-[clamp(1.9rem,4vw,3rem)]">
            What this demo is, and what it isn&rsquo;t
          </h2>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-dim">
            Read these before you judge the results. They are the limits we know about.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <dl className="divide-y divide-line-soft border-y border-line-soft">
            {ITEMS.map((item) => (
              <div key={item.term} className="grid gap-1.5 py-5 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-8">
                <dt className="font-medium text-fg">{item.term}</dt>
                <dd className="text-[0.95rem] leading-relaxed text-dim">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
