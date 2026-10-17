import { BrandWordmark } from "@/components/bank-rag/brand-mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-line-soft py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 text-sm text-faint sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8">
        <BrandWordmark />
        <div className="max-w-xl space-y-1.5 leading-relaxed md:text-right">
          <p>Customer records are synthetic; some documents come from public datasets.</p>
          <p>
            In this demo the application runs on IBM LinuxONE. It is not an IBM product, and no IBM endorsement is
            implied.
          </p>
        </div>
      </div>
    </footer>
  );
}
