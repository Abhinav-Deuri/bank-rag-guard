import { Fragment, type ReactNode } from "react";
import type { VaultToken } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Render text with redacted personal data and clickable source citations.
 *
 * - Mask tags such as [NAME] or [IBAN] become redaction bars, roughly as wide as the kind of
 *   value they replaced, so a reader can see that something was removed and what kind it was.
 * - When `vaultTokens` and `onSelectToken` are supplied (Pivot 2: Cryptographic Break-Glass),
 *   each redaction bar displays its deterministic token ID (e.g. IBAN · 884A) and can be clicked
 *   to initiate Dual-Custody Compliance Unmasking, or displays the unmasked plaintext once approved.
 * - "Source 3" / "Sources 1 and 2" become footnote buttons when `onCite` is given.
 * - A small subset of Markdown the model tends to use: blank-line paragraphs, "- " list items
 *   and **bold**.
 */
const TOKENS = /(\[[A-Z][A-Z0-9_]*\]|\*\*.*?\*\*|\bSources?\s+\d+(?:(?:,\s*|\s+and\s+)\d+)*\b)/gi;
const TAG = /^\[([A-Z][A-Z0-9_]*)\]$/i;
const CITE = /\bSources?\s+(\d+(?:(?:,\s*|\s+and\s+)\d+)*)\b/i;

const WIDTH: Record<string, number> = {
  NAME: 16,
  IBAN: 23,
  EMIRATES_ID: 18,
  PHONE: 12,
  EMAIL: 20,
  CREDIT_CARD: 16,
  CARD_NUMBER: 16,
  CARD_CVV: 4,
  CARD_EXPIRY: 6,
  SSN: 11,
  BANK_ACCOUNT: 10,
  BIC: 9,
  PIN: 4,
  DATE_OF_BIRTH: 10,
  CRYPTO_ADDRESS: 24,
};

const LABEL: Record<string, string> = {
  NAME: "NAME",
  IBAN: "IBAN",
  EMIRATES_ID: "EMIRATES ID",
  PHONE: "PHONE",
  EMAIL: "EMAIL",
  CREDIT_CARD: "CARD",
  CARD_NUMBER: "CARD",
  CARD_CVV: "CVV",
  CARD_EXPIRY: "EXPIRY",
  SSN: "SSN",
  BANK_ACCOUNT: "ACCOUNT",
  BIC: "BIC",
  PIN: "PIN",
  DATE_OF_BIRTH: "DOB",
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

export function RedactionBar({
  tag,
  vaultToken,
  unmaskedValue,
  onSelectToken,
  reveal,
}: {
  tag: string;
  vaultToken?: VaultToken;
  unmaskedValue?: string;
  onSelectToken?: (token: VaultToken) => void;
  reveal?: RevealProps;
}) {
  const { base, n } = splitToken(tag);
  const word = LABEL[base] ?? base.replace(/_/g, " ");
  const baseLabel = n ? `${word} ${n}` : word;
  const shortHex = vaultToken?.token_id.split("_TOKEN_")[1];
  const displayLabel = shortHex ? `${word} · ${shortHex}` : baseLabel;
  const width = Math.max(WIDTH[base] ?? 8, displayLabel.length + 2);

  // Check if revealed via legacy reveal panel
  const legacyVal = reveal?.values[tag];
  const finalVal = unmaskedValue || legacyVal;

  if (finalVal) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded border border-ok/50 bg-ok/15 px-2 py-0.5 font-mono text-[12.5px] font-medium text-ok align-baseline [unicode-bidi:isolate]"
        dir="ltr"
        title={`Unmasked via Dual-Custody Break-Glass (${vaultToken?.token_id ?? baseLabel}) — logged to SHA-256 chain`}
      >
        <span className="text-[10px] uppercase tracking-wider opacity-80">{word}:</span>
        <span className="font-semibold underline decoration-ok/50 underline-offset-2">{finalVal}</span>
      </span>
    );
  }

  if (vaultToken && onSelectToken) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectToken(vaultToken);
        }}
        className="redact-bar cursor-pointer transition-all hover:border-accent hover:text-accent hover:shadow-[0_0_10px_rgba(56,189,248,0.28)]"
        style={{ minWidth: `${width}ch` }}
        title={`Deterministic token ${vaultToken.token_id} — Click to request Just-in-Time Cryptographic Break-Glass Unmasking`}
      >
        {displayLabel} 🔒
      </button>
    );
  }

  if (reveal?.onRequest && n) {
    return (
      <button
        type="button"
        className="redact-bar cursor-pointer hover:outline hover:outline-1 hover:outline-accent"
        style={{ minWidth: `${width}ch` }}
        title={`Request to reveal ${baseLabel}. A second person must approve.`}
        aria-label={`${baseLabel}, removed. Request to reveal.`}
        onClick={(e) => {
          e.stopPropagation();
          reveal.onRequest?.(tag);
        }}
      >
        {baseLabel}
      </button>
    );
  }

  return (
    <span
      className="redact-bar"
      style={{ minWidth: `${width}ch` }}
      title={`${word.toLowerCase()} removed before the model read this`}
    >
      {displayLabel}
    </span>
  );
}

export interface CiteProps {
  active: number | null;
  onCite: (n: number) => void;
}

interface TokenCursor {
  byLabel: Record<string, number>;
  all: VaultToken[];
  unmaskedMap?: Record<string, string>;
  onSelectToken?: (token: VaultToken) => void;
  reveal?: RevealProps;
}

function nextTokenForLabel(tag: string, cursor: TokenCursor | undefined): VaultToken | undefined {
  if (!cursor || !cursor.all.length) return undefined;
  const { base } = splitToken(tag);
  const matches = cursor.all.filter((t) => t.label === tag || t.label === base);
  if (!matches.length) return undefined;
  const idx = cursor.byLabel[base] ?? 0;
  cursor.byLabel[base] = idx + 1;
  return matches[idx % matches.length];
}

function inline(
  text: string,
  cite: CiteProps | undefined,
  keyBase: string,
  cursor?: TokenCursor,
): ReactNode[] {
  const out: ReactNode[] = [];
  text.split(TOKENS).forEach((part, i) => {
    if (!part) return;
    const key = `${keyBase}-${i}`;
    const tag = part.match(TAG);
    if (tag) {
      const vt = nextTokenForLabel(tag[1], cursor);
      const unmasked = vt && cursor?.unmaskedMap ? cursor.unmaskedMap[vt.token_id] : undefined;
      out.push(
        <RedactionBar
          key={key}
          tag={tag[1]}
          vaultToken={vt}
          unmaskedValue={unmasked}
          onSelectToken={cursor?.onSelectToken}
          reveal={cursor?.reveal}
        />,
      );
      return;
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      out.push(
        <strong key={key} className="font-semibold text-fg">
          {inline(part.slice(2, -2), cite, key, cursor)}
        </strong>,
      );
      return;
    }
    const match = part.match(CITE);
    if (match && cite) {
      const numbers = match[1]
        .split(/(?:,\s*|\s+and\s+)/)
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (numbers.length) {
        out.push(
          <span key={key} className="whitespace-nowrap font-sans text-xs">
            {" "}
            {numbers.map((n, idx) => {
              const active = cite.active === n;
              return (
                <button
                  key={`${key}-${n}`}
                  type="button"
                  onClick={() => cite.onCite(n)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[11px] font-medium leading-none tabular-nums transition-colors",
                    idx > 0 && "ms-0.5",
                    active ? "bg-accent text-white" : "bg-panel-soft text-dim hover:bg-hover hover:text-fg",
                  )}
                  title={`Source ${n}`}
                >
                  {n}
                </button>
              );
            })}
          </span>,
        );
        return;
      }
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
  vaultTokens,
  unmaskedMap,
  onSelectToken,
}: {
  text: string;
  cite?: CiteProps;
  reveal?: RevealProps;
  className?: string;
  paragraphClassName?: string;
  vaultTokens?: VaultToken[];
  unmaskedMap?: Record<string, string>;
  onSelectToken?: (token: VaultToken) => void;
}) {
  const blocks = text.trim().split(/\n\s*\n/);
  const cursor: TokenCursor | undefined =
    (vaultTokens && vaultTokens.length) || reveal || onSelectToken
      ? { byLabel: {}, all: vaultTokens ?? [], unmaskedMap, onSelectToken, reveal }
      : undefined;

  return (
    <div dir="auto" className={cn("[overflow-wrap:anywhere]", className)}>
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l));
        if (isList) {
          return (
            <ul key={b} className={cn("list-disc ps-5", paragraphClassName)}>
              {lines.map((l, i) => (
                <li key={i}>{inline(l.replace(/^\s*[-*•]\s+/, ""), cite, `${b}-${i}`, cursor)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={b} className={paragraphClassName}>
            {lines.map((l, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {inline(l.replace(/^\s*[-*•]\s+/, "• "), cite, `${b}-${i}`, cursor)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
