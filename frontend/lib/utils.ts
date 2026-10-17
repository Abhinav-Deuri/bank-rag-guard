import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The backend counts Python code points, so count the same way (not UTF-16 units). */
export function codePointLength(text: string): number {
  let n = 0;
  for (const _ of text) n += 1;
  return n;
}

export function truncateCodePoints(text: string, max: number): string {
  let out = "";
  let n = 0;
  for (const ch of text) {
    if (n >= max) break;
    out += ch;
    n += 1;
  }
  return out;
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
