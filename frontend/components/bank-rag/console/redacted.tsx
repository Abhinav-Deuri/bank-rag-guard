import { Fragment, type ReactNode } from "react";
import type { VaultToken } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Renders backend text as plain React text (never HTML).
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

export function RedactionBar({
  tag,
  vaultToken,
  unmaskedValue,
  onSelectToken,
}: {
  tag: string;
  vaultToken?: VaultToken;
  unmaskedValue?: string;
  onSelectToken?: (token: VaultToken) => void;
}) {
  const label = LABEL[tag] ?? tag.replace(/_/g, " ");
  const shortHex = vaultToken?.token_id.split("_TOKEN_")[1];
  const displayLabel = shortHex ? `${label} · ${shortHex}` : label;
  const width = Math.max(WIDTH[tag] ?? 8, displayLabel.length + 2);

  if (unmaskedValue) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded border border-ok/50 bg-ok/15 px-2 py-0.5 font-mono text-[12.5px] font-medium text-ok align-baseline"
        title={`Unmasked via Dual-Custody Break-Glass (${vaultToken?.token_id ?? label}) — logged to SHA-256 chain`}
      >
        <span className="text-[10px] uppercase tracking-wider opacity-80">{label}:</span>
        <span className="font-semibold underline decoration-ok/50 underline-offset-2">{unmaskedValue}</span>
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

  return (
    <span
      className="redact-bar"
      style={{ minWidth: `${width}ch` }}
      title={`${label.toLowerCase()} removed before the model read this`}
    >
      {displayLabel}
    </span>
  );
}

export interface CiteProps {
  /** Number of sources returned with this answer; references beyond it stay plain text. */
  count: number;
  selected: number | null;
  onCite: (n: number) => void;
}

interface TokenCursor {
  byLabel: Record<string, number>;
  all: VaultToken[];
  unmaskedMap?: Record<string, string>;
  onSelectToken?: (token: VaultToken) => void;
}

function nextTokenForLabel(tag: string, cursor: TokenCursor | undefined): VaultToken | undefined {
  if (!cursor || !cursor.all.length) return undefined;
  const matches = cursor.all.filter((t) => t.label === tag);
  if (!matches.length) return undefined;
  const idx = cursor.byLabel[tag] ?? 0;
  cursor.byLabel[tag] = idx + 1;
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
  vaultTokens,
  unmaskedMap,
  onSelectToken,
}: {
  text: string;
  cite?: CiteProps;
  className?: string;
  paragraphClassName?: string;
  vaultTokens?: VaultToken[];
  unmaskedMap?: Record<string, string>;
  onSelectToken?: (token: VaultToken) => void;
}) {
  const blocks = text.trim().split(/\n\s*\n/);
  const cursor: TokenCursor | undefined =
    vaultTokens && vaultTokens.length
      ? { byLabel: {}, all: vaultTokens, unmaskedMap, onSelectToken }
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
