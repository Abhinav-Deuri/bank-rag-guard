import type { CSSProperties, FC, ReactNode } from "react";

export interface GooeyNavItem {
  label?: string;
  /** Anchor target. Without it the item renders as a button. */
  href?: string;
  icon?: ReactNode;
}

export interface GooeyNavProps {
  items?: GooeyNavItem[];
  initialActiveIndex?: number;
  /** Controlled active index. When set, the component follows it and only reports clicks via onChange. */
  activeIndex?: number;
  onChange?: (index: number, item: GooeyNavItem) => void;
  theme?: "dark" | "light";
  /** Color of the active pill. */
  color?: string;
  /** Text color on the active pill. Defaults to a contrasting ink. */
  activeTextColor?: string;
  /** Optional particle tints. */
  colors?: string[];
  size?: "sm" | "md" | "lg";
  /** Draws the rounded glass frame around the links. */
  frame?: boolean;
  animationTime?: number;
  particleCount?: number;
  timeVariance?: number;
  spread?: number;
  gooeyness?: number;
  wobble?: number;
  hoverEffect?: boolean;
  className?: string;
  style?: CSSProperties & Record<`--${string}`, string | number | undefined>;
}

declare const GooeyNav: FC<GooeyNavProps>;
export default GooeyNav;
