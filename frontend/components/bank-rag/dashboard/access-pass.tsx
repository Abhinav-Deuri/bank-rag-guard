import type { DemoUser } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Dark "pass" card for the selected demo identity, in the spirit of a bank card: who is asking and
 * at which clearance tier. It shows only what /api/users returned. Demo identity, no password.
 */
export function AccessPass({ user }: { user: DemoUser | null }) {
  const tier = user?.tier ?? 0;
  const max = Math.max(3, tier);

  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl p-5 text-white shadow-[var(--card-shadow)]"
      style={{ background: "linear-gradient(140deg, #070a06 0%, #141f08 52%, #070a06 100%)" }}
      aria-label={user ? `Access pass for ${user.username}, tier ${user.tier}` : "No demo user selected"}
    >
      <div aria-hidden className="absolute -left-12 -top-20 -z-10 size-64 rounded-full bg-[#b8f13c]/25 blur-3xl" />
      <div aria-hidden className="absolute -bottom-24 -right-10 -z-10 size-56 rounded-full bg-[#b8f13c]/10 blur-3xl" />

      <div className="flex items-start justify-between">
        <span
          aria-hidden
          className="relative block h-7 w-9 overflow-hidden rounded-md bg-[linear-gradient(135deg,#d9dccf,#8d9283)]"
        >
          <span className="absolute inset-x-0 top-1/2 h-px bg-black/25" />
          <span className="absolute inset-y-0 left-1/3 w-px bg-black/25" />
          <span className="absolute inset-y-0 left-2/3 w-px bg-black/25" />
        </span>
        <span className="text-[0.7rem] font-semibold tracking-[0.18em] text-white/70">DEMO ID</span>
      </div>

      <p aria-hidden className="mt-6 flex gap-3 text-lg tracking-[0.35em] text-white/60">
        <span>••••</span>
        <span>••••</span>
      </p>

      <p className="mt-2 truncate text-xl font-semibold tracking-tight">{user ? user.username : "No user selected"}</p>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-wider text-white/55">Role</p>
          <p className="text-sm font-semibold capitalize">{user ? user.role : "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-[0.7rem] font-medium uppercase tracking-wider text-white/55">Clearance</p>
          <p className="flex items-center justify-end gap-2 text-sm font-semibold">
            <span aria-hidden className="flex items-center gap-1">
              {Array.from({ length: max }, (_, i) => (
                <span
                  key={i}
                  className={cn("h-1.5 w-3.5 rounded-full", i < tier ? "bg-[#b8f13c]" : "bg-white/20")}
                />
              ))}
            </span>
            <span className="num">{user ? `Tier ${user.tier}` : "—"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
