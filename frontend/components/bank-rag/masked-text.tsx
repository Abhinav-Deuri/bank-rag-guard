import { cn } from "@/lib/utils";

const TAG = /(\[[A-Z][A-Z0-9_]*\])/g;

/**
 * Renders backend text as plain text (never HTML) and highlights mask tags such
 * as [NAME] or [IBAN] without changing the underlying characters.
 */
export function MaskedText({
  text,
  className,
  as: Tag = "div",
}: {
  text: string;
  className?: string;
  as?: "div" | "p" | "span";
}) {
  const parts = text.split(TAG);
  return (
    <Tag dir="auto" className={cn("whitespace-pre-wrap [overflow-wrap:anywhere]", className)}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="tag-chip">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </Tag>
  );
}
