import type { FC, HTMLAttributes } from "react";

export interface DecryptedTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  text: string;
  /** Milliseconds per animation tick (minimum 16). */
  speed?: number;
  maxIterations?: number;
  /** Reveal one character at a time instead of all at once. */
  sequential?: boolean;
  revealDirection?: "start" | "end" | "center" | "random";
  useOriginalCharsOnly?: boolean;
  /** Pool of characters used while scrambling. */
  characters?: string;
  /** Class for revealed characters. */
  className?: string;
  /** Class for the wrapper element. */
  parentClassName?: string;
  /** Class for characters that are still scrambled. */
  encryptedClassName?: string;
  animateOn?: "hover" | "view" | "click" | "inViewHover";
  clickMode?: "once" | "toggle";
  effect?: "scramble" | "fade" | "flip";
  /** Color of scrambled characters; they settle back to the surrounding text color. */
  scrambleColor?: string;
  loop?: boolean;
  loopDelay?: number;
  /** With a hover mode, only characters within this many px of the pointer scramble. */
  hoverRadius?: number;
}

declare const DecryptedText: FC<DecryptedTextProps>;
export default DecryptedText;
