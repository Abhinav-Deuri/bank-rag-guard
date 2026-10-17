import { cn } from "@/lib/utils";

const HUES = [24, 150, 205, 290, 340, 70];

function hash(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h;
}

/** Initials on a pastel tint picked from the name, so each demo user keeps their own color. */
export function Avatar({
  name,
  className,
  ring = false,
}: {
  name: string;
  className?: string;
  /** Lime ring for the selected user. */
  ring?: boolean;
}) {
  const hue = HUES[hash(name) % HUES.length];
  return (
    <span
      aria-hidden
      style={{ background: `oklch(0.84 0.09 ${hue})`, color: `oklch(0.26 0.06 ${hue})` }}
      className={cn(
        "grid size-10 shrink-0 select-none place-items-center rounded-full text-sm font-semibold uppercase",
        ring && "ring-2 ring-lime ring-offset-2 ring-offset-panel",
        className,
      )}
    >
      {name.slice(0, 2)}
    </span>
  );
}
