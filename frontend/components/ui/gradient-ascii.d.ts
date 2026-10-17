import type { CSSProperties, FC, HTMLAttributes } from "react";

export interface GradientASCIIProps extends Omit<HTMLAttributes<HTMLDivElement>, "style" | "className"> {
  /** Two to eight colors, from the edge of the shadow to the brightest point. Dark areas stay transparent. */
  colors?: string[];
  shape?: "horizon" | "pinch" | "rise" | "eclipse";
  /** Characters from dimmest to brightest. */
  characters?: string;
  /** Height of each character cell in px. */
  cellSize?: number;
  /** Share of cells that show a character (0 to 1). */
  density?: number;
  glyphOpacity?: number;
  gradientOpacity?: number;
  /** 0 to 1.5 */
  glow?: number;
  depthOfField?: number;
  flicker?: number;
  softness?: number;
  /** 0.4 to 2.5 */
  scale?: number;
  /** 0 to 2 */
  flow?: number;
  /** 0 holds the shape still. */
  speed?: number;
  /** 0 to 0.4 */
  grain?: number;
  variation?: number;
  mouseInteraction?: boolean;
  scrambleRadius?: number;
  clickEffect?: "wave" | "burst" | "none";
  intro?: boolean;
  lightMode?: boolean;
  fontFamily?: string;
  /** Maximum device pixel ratio, capped at 2. */
  dpr?: number;
  className?: string;
  style?: CSSProperties;
}

declare const GradientASCII: FC<GradientASCIIProps>;
export default GradientASCII;
