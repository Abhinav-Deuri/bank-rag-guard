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

export function RedactionBar({ tag }: { tag: string }) {
  const label = LABEL[tag] ?? tag.replace(/_/g, " ");
  const width = Math.max(WIDTH[tag] ?? 8, label.length + 1);
  return (
    <span
      className="redact-bar"
      style={{ minWidth: `${width}ch` }}
      title={`${label.toLowerCase()} removed before the model read this`}
    >
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

function inline(text: string, cite: CiteProps | undefined, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  text.split(TOKENS).forEach((part, i) => {
    if (!part) return;
    const key = `${keyBase}-${i}`;
    const tag = part.match(TAG);
    if (tag) {
      out.push(<RedactionBar key={key} tag={tag[1]} />);
      return;
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      out.push(
        <strong key={key} className="font-semibold text-fg">
          {inline(part.slice(2, -2), cite, key)}
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
                className={cn(
                  "num px-px font-sans font-semibold underline decoration-1 underline-offset-[3px]",
                  on ? "text-accent" : "text-dim hover:text-fg",
                )}
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
  className,
  paragraphClassName = "mb-2.5 last:mb-0",
}: {
  text: string;
  cite?: CiteProps;
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
                <li key={i}>{inline(l.replace(/^\s*[-*•]\s+/, ""), cite, `${b}-${i}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={b} className={paragraphClassName}>
            {lines.map((l, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {inline(l.replace(/^\s*[-*•]\s+/, "• "), cite, `${b}-${i}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
