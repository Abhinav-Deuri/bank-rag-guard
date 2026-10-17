import { Search } from "lucide-react";

/** The reference's search pill. Here it filters the audit events that are already displayed. */
export function SearchPill({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="dash-card flex w-full items-center gap-2.5 rounded-full px-4 py-2.5 text-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent sm:w-72">
      <Search className="size-4 shrink-0 text-faint" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filter displayed events"
        placeholder="Filter audit events"
        className="w-full min-w-0 bg-transparent text-fg outline-none placeholder:text-faint"
      />
    </label>
  );
}
