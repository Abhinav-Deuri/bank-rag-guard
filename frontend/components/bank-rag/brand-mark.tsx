import { cn } from "@/lib/utils";
import mark from "./aegis-z-mark.png";

/**
 * The AEGIS-Z shield. The image is used as a mask, so the shield takes the current text colour:
 * light on the dark terminal screen, dark in the plain view.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-[1.25em] shrink-0 bg-current align-[-0.22em]", className)}
      style={{
        WebkitMaskImage: `url(${mark.src})`,
        maskImage: `url(${mark.src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
