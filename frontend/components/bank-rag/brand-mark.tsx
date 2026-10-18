import { FileText, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shield around a document. Drawn from Lucide icons; deliberately not an IBM mark. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-grid size-8 place-items-center text-accent", className)}
    >
      <Shield className="absolute inset-0 size-full" strokeWidth={1.4} />
      <FileText className="relative size-[44%]" strokeWidth={1.8} />
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="text-[1.05rem] font-semibold tracking-tight text-fg">AEGIS-Z</span>
    </span>
  );
}
