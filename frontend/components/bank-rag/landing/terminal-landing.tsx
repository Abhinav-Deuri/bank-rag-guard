import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/bank-rag/brand-mark";

/*
  The landing page, in the same professional theme as the workspace. It says what AEGIS-Z is in one
  sentence, shows the same question asked at two clearance levels, gives the measured results, then
  the seven steps and the known limits. Everything in the example is synthetic and labelled as such.
*/

const WORKSPACE = "/workspace";

function Bar({ children }: { children: ReactNode }) {
  return <span className="redact-bar">{children}</span>;
}

function Box({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("term-box", className)}>
      <span className="term-box-title">{title}</span>
      {children}
    </div>
  );
}

/** Lines of the example appear one after another, once, on load. */
function L({ i, children, className }: { i: number; children: ReactNode; className?: string }) {
  return (
    <div className={cn("term-replay", className)} style={{ "--i": i } as CSSProperties}>
      {children}
    </div>
  );
}

function Checks({ i, items }: { i: number; items: string[] }) {
  return (
    <L i={i} className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {items.map((t) => (
        <span key={t} className="term-stat" data-s="ok">
          {t}
        </span>
      ))}
    </L>
  );
}

function Example() {
  return (
    <Box title="Example, synthetic data: the same question at two clearance levels" className="min-w-0">
      <div aria-label="The same question asked by a teller and by a compliance officer">
        <L i={0} className="text-[13px] text-faint">
          teller1 · cleared for tier 1
        </L>
        <L i={1} className="font-semibold text-fg">
          What do the contracts say about termination?
        </L>
        <Checks i={2} items={["Guard passed", "Tier 1 only", "6 details masked", "Logged #241"]} />
        <L i={3} className="mt-2 text-dim">
          The documents you can read don’t cover contract termination.
        </L>

        <div className="my-4 border-t border-line-soft" />

        <L i={5} className="text-[13px] text-faint">
          compliance1 · cleared for tiers 1–3
        </L>
        <L i={6} className="font-semibold text-fg">
          What do the contracts say about termination?
        </L>
        <Checks i={7} items={["Guard passed", "Tiers 1–3", "1 detail masked", "Logged #242"]} />
        <L i={8} className="mt-2 text-dim">
          Either party may end the agreement with thirty days’ written notice. Notices go to <Bar>NAME 1</Bar>.
        </L>
      </div>
    </Box>
  );
}

/** Measured results, from eval/multilingual_guard_summary.csv and eval/red_team_summary.csv. */
const RESULTS: { value: string; label: string; note: string }[] = [
  { value: "32 / 32", label: "attacks blocked", note: "English, Arabic, Arabizi and mixed" },
  { value: "8 / 8 vs 0 / 8", label: "Arabizi attacks blocked", note: "AEGIS-Z guard vs Meta Llama Prompt Guard 2" },
  { value: "0 / 16", label: "normal questions blocked", note: "no false alarms on everyday staff questions" },
  { value: "0 / 36", label: "red-team attacks got through", note: "three rounds against the full pipeline" },
];

const STEPS: { stage: string; brief: string; does: ReactNode }[] = [
  {
    stage: "Identity",
    brief: "Role and tier come from the account",
    does: "The role and clearance tier come from the account, never from what the question claims.",
  },
  {
    stage: "Input guard",
    brief: "Attacks stopped before any search",
    does: "A model screens the question for prompt injection, in English, Arabic and Arabizi. Personal data in the question is removed first, so the guard never sees it.",
  },
  {
    stage: "Clearance filter",
    brief: "Restricted documents are never retrieved",
    does: (
      <>
        The tier rule is part of the database query: <code className="t-string">WHERE tier &lt;= user_tier</code>.
        Restricted documents are never retrieved, so a tricked model has nothing to reveal.
      </>
    ),
  },
  {
    stage: "Passage screen",
    brief: "Hidden instructions are withheld",
    does: "Retrieved passages that contain instructions aimed at the assistant are withheld before the model reads them.",
  },
  {
    stage: "Masking",
    brief: "Personal data removed before the model",
    does: (
      <>
        Names, IBANs, Emirates IDs and phone numbers become numbered tags such as <Bar>IBAN 1</Bar>, by pattern
        and checksum, with no AI involved. Arabic text is handled the same way.
      </>
    ),
  },
  {
    stage: "Answer checks",
    brief: "Answer re-masked; fishing flagged",
    does: "The answer is masked again. A mosaic check flags anyone who reaches many different customers within an hour.",
  },
  {
    stage: "Audit log",
    brief: "Every step in a tamper-evident log",
    does: "Every step is written to an append-only log where each entry carries the fingerprint of the one before. Editing one breaks the chain, and anyone can re-check it.",
  },
];

const LIMITS: { title: string; body: string }[] = [
  {
    title: "Demo identities have no password",
    body: "Switching between teller1, auditor1 and compliance1 isn't a sign-in. A real deployment would use the bank's single sign-on.",
  },
  {
    title: "The data is synthetic or public",
    body: "Customer records are generated. Contracts and email come from public datasets. The tiers are labels assigned for testing, not real clearances.",
  },
  {
    title: "Names are the hardest part of masking",
    body: "IBANs, Emirates IDs and cards are checked by checksum and are reliable. On our unseen English test set the name finder catches about two names in three. Clearance never depends on masking: restricted text is filtered out in the database first.",
  },
  {
    title: "The interface is in English",
    body: "Questions, documents and answers work in English and Arabic, and the guard was tested on Arabizi too. Menus and labels are not translated yet.",
  },
  {
    title: "Masked text uses outside services here",
    body: "Masked questions and passages go to Jina for search and Groq for the language model. Running both models on the same LinuxONE system is the production plan, not today's setup.",
  },
  {
    title: "The log is tamper-evident, not tamper-proof",
    body: "Changing or removing an entry in the middle of the log is detected. Someone with database superuser rights could still remove the newest entries without breaking the chain.",
  },
];

export function TerminalLanding() {
  return (
    <div className="term flex min-h-dvh flex-col text-fg">
      <header className="sticky top-0 z-10 border-b border-line bg-panel">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <span className="inline-flex items-center gap-2 text-[16px] font-semibold">
            <BrandMark className="text-accent" />
            AEGIS-Z
          </span>
          <nav aria-label="Page" className="ms-auto flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px]">
            <a href="#results" className="text-dim hover:text-fg">
              Results
            </a>
            <a href="#how" className="text-dim hover:text-fg">
              How it works
            </a>
            <a href="#limits" className="text-dim hover:text-fg">
              Limits
            </a>
            <Link href={WORKSPACE} className="term-key term-key-primary">
              Open the workspace
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-x-12 gap-y-10 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-accent">Secure AI assistant for bank staff</p>
            <h1 className="mt-3 max-w-[18ch] text-[clamp(2rem,4.6vw,3.2rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-fg">
              Secure answers start before the model.
            </h1>
            <p className="mt-5 max-w-[56ch] text-[16px] leading-relaxed text-dim">
              AEGIS-Z answers questions from customer complaints, contracts and internal email using only the
              documents the person asking is cleared to read. Names, IBANs and Emirates IDs are removed before the AI
              sees anything, in English and Arabic, and every step is recorded in a log that shows tampering.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href={WORKSPACE} className="term-key term-key-primary px-5 py-2 text-[15px]">
                Open the workspace
              </Link>
              <a href="#how" className="term-link">
                See what happens to a question
              </a>
            </div>
            <p className="mt-8 text-[13px] text-faint">
              Built for the IBM Z Datathon. Runs on IBM LinuxONE with PostgreSQL and pgvector.
            </p>
          </div>
          <Example />
        </section>

        <section id="results" className="scroll-mt-16 border-t border-line-soft bg-panel">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="text-[22px] font-semibold text-fg">Measured results</h2>
            <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {RESULTS.map((r) => (
                <div key={r.label} className="border-s-2 border-accent ps-4">
                  <dt className="text-[14px] text-dim">{r.label}</dt>
                  <dd className="mt-1 text-[26px] font-semibold leading-tight text-fg">{r.value}</dd>
                  <dd className="mt-1 text-[13px] text-faint">{r.note}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 max-w-[80ch] text-[13px] text-faint">
              Our own test sets: 48 hand-written messages (32 attacks, 16 normal questions) and 36 red-team attacks, one
              run each. Prompt Guard 2 is a small injection classifier, not built to judge requests for personal data,
              which explains many of its misses. Details in the README.
            </p>
          </div>
        </section>

        <section id="how" className="scroll-mt-16 border-t border-line-soft">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-[22px] font-semibold text-fg">What happens to a question</h2>
            <p className="mt-2 max-w-[64ch] text-dim">
              Seven steps, in order. Open one to read how it works. The workspace shows the result of each step under
              every answer.
            </p>
            <ol className="mt-6 divide-y divide-line-soft border-y border-line-soft">
              {STEPS.map((s, i) => (
                <li key={s.stage}>
                  <details className="term-details">
                    <summary className="term-row py-3">
                      <span aria-hidden className="term-row-mark" />
                      <span className="t-num w-6 shrink-0">{i + 1}</span>
                      <span className="w-[11rem] shrink-0 font-medium text-fg max-sm:w-auto">{s.stage}</span>
                      <span className="min-w-0 text-dim max-sm:hidden">{s.brief}</span>
                    </summary>
                    <p className="max-w-[72ch] px-[3.6rem] pb-4 pt-1 text-dim max-sm:px-2">{s.does}</p>
                  </details>
                </li>
              ))}
            </ol>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <Box title="Masking, before and after">
                <p className="text-[13px] text-faint">Before (never sent to the model)</p>
                <p className="mt-1 text-dim">Customer Salma Haddad, IBAN AE07 0331 2345 6789 0123 456, disputed a card charge.</p>
                <p className="mt-4 text-[13px] text-faint">What the model reads</p>
                <p className="mt-1">
                  Customer <Bar>NAME 1</Bar>, IBAN <Bar>IBAN 1</Bar>, disputed a card charge.
                </p>
                <p className="mt-3" dir="rtl">
                  أبلغ العميل <Bar>NAME 2</Bar> عن معاملة متنازع عليها على الحساب <Bar>IBAN 2</Bar>.
                </p>
              </Box>
              <Box title="Break-glass, when one value is really needed">
                <ol className="space-y-2 text-dim">
                  <li>
                    <span className="t-num">1 </span> A compliance officer selects <Bar>IBAN 1</Bar> in an answer and
                    gives a reason, such as an alert number.
                  </li>
                  <li>
                    <span className="t-num">2 </span> A different person approves or denies. Nobody approves their own
                    request.
                  </li>
                  <li>
                    <span className="t-num">3 </span> The requester sees the value once, within 15 minutes. Each step is
                    in the audit log; the value never is.
                  </li>
                </ol>
              </Box>
            </div>
          </div>
        </section>

        <section id="limits" className="scroll-mt-16 border-t border-line-soft">
          <div className="mx-auto grid w-full max-w-6xl gap-x-12 gap-y-6 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <div>
              <h2 className="text-[22px] font-semibold text-fg">What this demo is, and what it isn’t</h2>
              <p className="mt-2 text-dim">The limits we know about. Open each one before you judge the results.</p>
            </div>
            <ul className="divide-y divide-line-soft border-y border-line-soft">
              {LIMITS.map((l) => (
                <li key={l.title}>
                  <details className="term-details">
                    <summary className="term-row py-3">
                      <span aria-hidden className="term-row-mark" />
                      <span className="text-fg">{l.title}</span>
                    </summary>
                    <p className="max-w-[72ch] px-[1.6rem] pb-4 pt-1 text-dim">{l.body}</p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-line-soft bg-panel">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-12 sm:px-6">
            <p className="max-w-[60ch] text-dim">
              Ask the same question as a teller and as a compliance officer, try to break the guard, or reveal one hidden
              value with a second person’s approval.
            </p>
            <Link href={WORKSPACE} className="term-key term-key-primary px-5 py-2 text-[15px]">
              Open the workspace
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-5 text-[13px] text-faint sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 md:flex-row md:justify-between">
          <span>AEGIS-Z, a bank document assistant. Customer records are synthetic; other documents are public.</span>
          <span>Runs on IBM LinuxONE. It is not an IBM product, and no IBM endorsement is implied.</span>
        </div>
      </footer>
    </div>
  );
}
