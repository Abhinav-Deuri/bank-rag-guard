import type { FC, ReactNode } from "react";

export interface BorderGlowProps {
  children?: ReactNode;
  className?: string;
  /** How close to an edge (0 to 100) the pointer must be before the glow appears. */
  edgeSensitivity?: number;
  /** Glow color as an HSL triplet string: "hue saturation lightness", e.g. "40 80 80". */
  glowColor?: string;
  /** Card background. Use a solid color; it also fills the gradient border's inner area. */
  backgroundColor?: string;
  /** Corner radius in px. */
  borderRadius?: number;
  /** How far the outer glow extends beyond the card, in px. */
  glowRadius?: number;
  glowIntensity?: number;
  /** Width of the lit arc around the card (0 to 50). */
  coneSpread?: number;
  /** Plays a one-off sweep on mount. */
  animated?: boolean;
  /** Colors of the mesh-gradient border (up to three are used). */
  colors?: string[];
  fillOpacity?: number;
}

declare const BorderGlow: FC<BorderGlowProps>;
export default BorderGlow;
