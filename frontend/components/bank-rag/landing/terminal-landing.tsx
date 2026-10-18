import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TermCursor } from "@/components/bank-rag/term-cursor";
import { LandingMotion } from "./landing-motion";

/*
  The landing page in the same operator-screen style as the workspace (IBM 3279 colours, IBM Plex
  Mono). One orchestrated moment: the session replay in the hero plays once on load. Everything
  it shows is synthetic and labelled as such.
*/

const WORKSPACE = "/workspace";

function Bar({ children }: { children: ReactNode }) {
  return <span className="redact-bar">{children}</span>;
}

/** Text painted onto the screen one character at a time (CSS only; the full text is in the DOM). */
function Painted({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((ch, i) => (
        <span key={i} aria-hidden className="term-paint" style={{ "--c": i } as CSSProperties}>
          {ch}
        </span>
      ))}
    </>
  );
}

function Box({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("term-box px-4 pb-4 pt-5", className)}>
      <span className="term-box-title">{title}</span>
      {children}
    </div>
  );
}

/** Lines of the replay appear one after another; --i sets each line's delay. */
function L({ i, children, className }: { i: number; children: ReactNode; className?: string }) {
  return (
    <div className={cn("term-replay", className)} style={{ "--i": i } as CSSProperties}>
      {children}
    </div>
  );
}

function Step({ tag, stage, detail, i }: { tag: "ok" | "skip"; stage: string; detail: string; i: number }) {
  return (
    <L i={i} className="grid grid-cols-[7ch_17ch_1fr] gap-x-1 text-[13px] max-sm:grid-cols-[7ch_1fr]">
      <span className={tag === "ok" ? "whitespace-pre text-ok" : "text-faint"}>{tag === "ok" ? "[ OK ]" : "[SKIP]"}</span>
      <span className="text-accent max-sm:hidden">{stage}</span>
      <span className="text-dim">
        <span className="text-accent sm:hidden">{stage}: </span>
        {detail}
      </span>
    </L>
  );
}

function Replay() {
  return (
    <Box title="Session replay, synthetic data" className="min-w-0">
      <div aria-label="Example: the same question asked by a teller and by a compliance officer">
        <L i={0} className="text-[13px] text-faint">
          09:41:02 teller1, reads tier 1 only
        </L>
        <L i={1}>
          <span className="text-accent">teller1 ===&gt;</span>{" "}
          <span className="text-ok">What do the contracts say about termination?</span>
        </L>
        <div className="mt-1.5">
          <Step i={2} tag="ok" stage="Input guard" detail="no attack found" />
          <Step i={3} tag="ok" stage="Clearance filter" detail="searched tier 1 only; tiers 2–3 locked" />
          <Step i={4} tag="ok" stage="Masking" detail="removed 6 personal details" />
          <Step i={5} tag="ok" stage="Audit log" detail="recorded as entry #241" />
        </div>
        <L i={6} className="mt-2">
          The documents you can read don’t cover contract termination.
        </L>

        <div className="my-4 border-t border-line-soft" />

        <L i={8} className="text-[13px] text-faint">
          09:41:30 compliance1, reads tiers 1–3
        </L>
        <L i={9}>
          <span className="text-accent">compliance1 ===&gt;</span>{" "}
          <span className="text-ok">What do the contracts say about termination?</span>
        </L>
        <div className="mt-1.5">
          <Step i={10} tag="ok" stage="Clearance filter" detail="searched tiers 1–3" />
          <Step i={11} tag="ok" stage="Masking" detail="removed 1 personal detail" />
        </div>
        <L i={12} className="mt-2">
          Either party may end the agreement with thirty days’ written notice. Notices go to <Bar>NAME 1</Bar>.
        </L>
      </div>
    </Box>
  );
}

const STEPS: { stage: string; does: ReactNode }[] = [
  {
    stage: "Identity",
    does: "The role and clearance tier come from the account, never from what the question claims.",
  },
  {
    stage: "Input guard",
    does: "A model screens the question for prompt injection, in English, Arabic and Arabizi. Personal data in the question is removed first, so the guard never sees it.",
  },
  {
    stage: "Clearance filter",
    does: (
      <>
        The tier rule is part of the database query: <code className="text-ok">WHERE tier &lt;= user_tier</code>.
        Restricted documents are never retrieved, so a tricked model has nothing to reveal.
      </>
    ),
  },
  {
    stage: "Passage screen",
    does: "Retrieved passages that contain instructions aimed at the assistant are withheld before the model reads them.",
  },
  {
    stage: "Masking",
    does: (
      <>
        Names, IBANs, Emirates IDs and phone numbers become numbered tags such as <Bar>IBAN 1</Bar>, by pattern
        and checksum, with no AI involved. Arabic text is handled the same way.
      </>
    ),
  },
  {
    stage: "Answer checks",
    does: "The answer is masked again. A mosaic check flags anyone who reaches many different customers within an hour.",
  },
  {
    stage: "Audit log",
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
      <TermCursor />
      <LandingMotion />
      <header className="sticky top-0 z-10 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-line bg-black px-4 py-2.5 sm:px-6">
        <span className="font-semibold">AEGIS-Z</span>
        <span className="hidden text-dim md:inline">Bank document assistant</span>
        <nav aria-label="Page" className="ms-auto flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <a href="#how" className="text-dim hover:text-fg">
            How it works
          </a>
          <a href="#limits" className="text-dim hover:text-fg">
            Limits
          </a>
          <Link href={WORKSPACE} className="term-key">
            Open the workspace
          </Link>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto grid w-full max-w-7xl gap-x-14 gap-y-12 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
          <div className="min-w-0">
            <h1
              aria-label="Secure answers start before the model."
              className="max-w-[16ch] text-[clamp(2.1rem,5.2vw,3.9rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-fg"
            >
              <Painted text="Secure answers start before the model." />
              <span aria-hidden className="term-cursor ms-[0.15ch]" />
            </h1>
            <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed text-dim">
              A document assistant for bank staff. It answers from customer complaints, contracts and internal email,
              but only from what the person asking is cleared to read, with names, IBANs and Emirates IDs removed
              before the model sees anything. Every step goes into a log that shows if anyone tampers with it.
            </p>
            <div className="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-3">
              <Link href={WORKSPACE} className="term-key term-key-primary text-[15px]">
                Open the workspace
              </Link>
              <a href="#how" className="text-dim underline decoration-line underline-offset-4 hover:text-fg">
                See what happens to a question
              </a>
            </div>
            <p className="mt-8 text-[13px] text-faint">
              Built for the IBM Z Datathon. Runs on IBM LinuxONE with PostgreSQL and pgvector. English and Arabic.
            </p>
          </div>
          <Replay />
        </section>

        <section id="how" className="scroll-mt-16 border-t border-line-soft">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-semibold leading-tight text-fg">
              What happens to a question
            </h2>
            <p className="mt-3 max-w-[64ch] text-dim">
              Seven steps, in order. The workspace shows each one under every answer, so you can check them as you go.
            </p>
            <ol data-boot className="mt-10 border-t border-line-soft">
              {STEPS.map((s, i) => (
                <li
                  key={s.stage}
                  style={{ "--i": i } as CSSProperties}
                  className="boot-row grid gap-x-6 gap-y-1 border-b border-line-soft py-5 sm:grid-cols-[4ch_7ch_18ch_minmax(0,60ch)]"
                >
                  <span className="text-faint">{String(i + 1).padStart(2, "0")}</span>
                  <span aria-hidden className="boot-tag whitespace-pre max-sm:hidden" />
                  <span className="text-accent">{s.stage}</span>
                  <p className="text-dim">{s.does}</p>
                </li>
              ))}
            </ol>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
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
                    <span className="text-faint">1 </span>A compliance officer selects <Bar>IBAN 1</Bar> in an answer and
                    gives a reason, such as an alert number.
                  </li>
                  <li>
                    <span className="text-faint">2 </span>A different person approves or denies. Nobody approves their
                    own request.
                  </li>
                  <li>
                    <span className="text-faint">3 </span>The requester sees the value once, within 15 minutes. Each step
                    is in the audit log; the value never is.
                  </li>
                </ol>
              </Box>
            </div>
          </div>
        </section>

        <section id="limits" className="scroll-mt-16 border-t border-line-soft">
          <div className="mx-auto grid w-full max-w-7xl gap-x-16 gap-y-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <div>
              <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-semibold leading-tight text-fg">
                What this demo is, and what it isn’t
              </h2>
              <p className="mt-3 text-dim">Read these before you judge the results. They are the limits we know about.</p>
            </div>
            <dl className="border-t border-line-soft">
              {LIMITS.map((l) => (
                <div key={l.title} className="grid gap-x-6 gap-y-1 border-b border-line-soft py-5 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
                  <dt className="text-fg">
                    <span className="text-warn">[NOTE]</span> {l.title}
                  </dt>
                  <dd className="text-dim">{l.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-line-soft">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="text-dim">
              Ask the same question as a teller and as a compliance officer, try to break the guard, or reveal one
              hidden value with a second person’s approval.
            </p>
            <Link
              href={WORKSPACE}
              className="group mt-5 flex flex-wrap items-baseline gap-x-3 border-b border-line pb-3 text-[clamp(1.1rem,2.6vw,1.6rem)] hover:border-ok"
            >
              <span className="text-accent">Command ===&gt;</span>
              <span className="text-ok group-hover:underline">open workspace</span>
              <span aria-hidden className="term-cursor" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-5 text-[13px] text-faint sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 md:flex-row md:justify-between">
          <span>AEGIS-Z, a bank document assistant. Customer records are synthetic; other documents are public.</span>
          <span>Runs on IBM LinuxONE. It is not an IBM product, and no IBM endorsement is implied.</span>
        </div>
      </footer>
    </div>
  );
}
