import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Renders backend text as plain React text (never HTML).
 *
 * - Mask tags such as [NAME] or [IBAN] become redaction bars, roughly as wide as the kind of
 *   value they replaced, so a reader can see that something was removed and what kind it was.
 * - "Source 3" / "Sources 1 and 2" become footnote buttons when `onCite` is given.
 * - A small subset of Markdown the model tends to use: blank-line paragraphs, "- " list items
 *   and **bold**.
 */

const TAG = /^\[([A-Z][A-Z0-9_]*)\]$/;
const TOKENS = /(\[[A-Z][A-Z0-9_]*\]|\*\*[^*\n]+\*\*|\bSources?\s+\d+(?:\s*(?:,|and|&|–|-|to)\s*\d+)*)/g;

/** Approximate printed length of each kind of value, in characters of the bar's font. */
const WIDTH: Record<string, number> = {
  NAME: 9,
  IBAN: 17,
  EMIRATES_ID: 13,
  PHONE: 10,
  EMAIL: 14,
  CARD: 13,
  CREDIT_CARD: 13,
  CARD_CVV: 4,
  PIN: 5,
  ACCOUNT_NUMBER: 11,
  SSN: 10,
  BIC: 9,
  IP_ADDRESS: 11,
  MAC_ADDRESS: 13,
  URL: 14,
  CRYPTO_ADDRESS: 18,
};

const LABEL: Record<string, string> = {
  EMIRATES_ID: "EMIRATES ID",
  ACCOUNT_NUMBER: "ACCOUNT",
  CREDIT_CARD: "CARD",
  CARD_CVV: "CVV",
  IP_ADDRESS: "IP",
  MAC_ADDRESS: "MAC",
  CRYPTO_ADDRESS: "WALLET",
};

/** "IBAN_2" -> { base: "IBAN", n: 2 }; "CARD_CVV" -> { base: "CARD_CVV", n: null }. */
export function splitToken(tag: string) {
  const m = tag.match(/^(.*?)_(\d+)$/);
  return m ? { base: m[1], n: Number(m[2]) } : { base: tag, n: null };
}

export interface RevealProps {
  /** Values this viewer has been shown, by token (for the answer being rendered). */
  values: Record<string, string>;
  /** Present when this viewer may ask to reveal tokens in this text. */
  onRequest?: (token: string) => void;
}

export function RedactionBar({ tag, reveal }: { tag: string; reveal?: RevealProps }) {
  const { base, n } = splitToken(tag);
  const word = LABEL[base] ?? base.replace(/_/g, " ");
  const label = n ? `${word} ${n}` : word;
  const width = Math.max(WIDTH[base] ?? 8, label.length + 1);
  const value = reveal?.values[tag];

  if (value) {
    return (
      <span
        className="mx-px rounded-[2px] border border-accent px-1 font-ledger text-[0.86em] text-fg [unicode-bidi:isolate]"
        dir="ltr"
        title={`${label}, shown after two-person approval`}
      >
        {value}
      </span>
    );
  }
  if (reveal?.onRequest && n) {
    return (
      <button
        type="button"
        className="redact-bar cursor-pointer hover:outline hover:outline-1 hover:outline-accent"
        style={{ minWidth: `${width}ch` }}
        title={`Request to reveal ${label}. A second person must approve.`}
        aria-label={`${label}, removed. Request to reveal.`}
        onClick={(e) => {
          e.stopPropagation();
          reveal.onRequest?.(tag);
        }}
      >
        {label}
      </button>
    );
  }
  return (
    <span className="redact-bar" style={{ minWidth: `${width}ch` }} title={`${word.toLowerCase()} removed before the model read this`}>
      {label}
    </span>
  );
}

export interface CiteProps {
  /** Number of sources returned with this answer; references beyond it stay plain text. */
  count: number;
  selected: number | null;
  onCite: (n: number) => void;
}

function inline(text: string, cite: CiteProps | undefined, keyBase: string, reveal?: RevealProps): ReactNode[] {
  const out: ReactNode[] = [];
  text.split(TOKENS).forEach((part, i) => {
    if (!part) return;
    const key = `${keyBase}-${i}`;
    const tag = part.match(TAG);
    if (tag) {
      out.push(<RedactionBar key={key} tag={tag[1]} reveal={reveal} />);
      return;
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      out.push(
        <strong key={key} className="font-semibold text-fg">
          {inline(part.slice(2, -2), cite, key, reveal)}
        </strong>,
      );
      return;
    }
    if (cite && /^Sources?\s+\d/.test(part)) {
      out.push(
        <Fragment key={key}>
          {part.split(/(\d+)/).map((bit, j) => {
            const n = Number(bit);
            if (!/^\d+$/.test(bit) || n < 1 || n > cite.count) return bit;
            const on = cite.selected === n;
            return (
              <button
                key={j}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cite.onCite(n);
                }}
                aria-pressed={on}
                aria-label={`Show source ${n}`}
                className="term-chip num mx-px text-[0.9em]"
              >
                {bit}
              </button>
            );
          })}
        </Fragment>,
      );
      return;
    }
    out.push(part);
  });
  return out;
}

export function Redacted({
  text,
  cite,
  reveal,
  className,
  paragraphClassName = "mb-2.5 last:mb-0",
}: {
  text: string;
  cite?: CiteProps;
  reveal?: RevealProps;
  className?: string;
  paragraphClassName?: string;
}) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div dir="auto" className={cn("[overflow-wrap:anywhere]", className)}>
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        if (isList) {
          return (
            <ul key={b} className={cn("list-disc ps-5", paragraphClassName)}>
              {lines.map((l, i) => (
                <li key={i}>{inline(l.replace(/^\s*[-*•]\s+/, ""), cite, `${b}-${i}`, reveal)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={b} className={paragraphClassName}>
            {lines.map((l, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {inline(l.replace(/^\s*[-*•]\s+/, "• "), cite, `${b}-${i}`, reveal)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
