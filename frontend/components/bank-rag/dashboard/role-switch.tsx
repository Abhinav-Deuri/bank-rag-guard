"use client";

import type { DemoUser } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Pills under the pass card (the "Deposit / Transfer" slot of a dashboard). They flip between the
 * lowest-tier and the highest-tier demo identity the backend returned, which is the comparison the
 * demo is built around. The selected user is always one of the pills. It selects an existing user;
 * it never changes a tier.
 */
export function RoleSwitch({
  users,
  selected,
  onSelect,
}: {
  users: DemoUser[] | null;
  selected: string | null;
  onSelect: (username: string) => void;
}) {
  const list = users ?? [];
  if (list.length === 0) return <div aria-hidden className="h-11 rounded-full bg-inset/60" />;

  const minTier = Math.min(...list.map((u) => u.tier));
  const maxTier = Math.max(...list.map((u) => u.tier));
  const current = list.find((u) => u.username === selected);
  const pick = (tier: number) =>
    current && current.tier === tier ? current : list.find((u) => u.tier === tier)!;

  const options: DemoUser[] = [pick(minTier)];
  if (current && current.tier > minTier && current.tier < maxTier) options.push(current);
  if (maxTier > minTier) options.push(pick(maxTier));

  return (
    <div
      role="group"
      aria-label="Switch between the lowest and highest clearance"
      className={cn("grid gap-2", options.length === 3 ? "grid-cols-3" : options.length === 2 ? "grid-cols-2" : "grid-cols-1")}
    >
      {options.map((user) => {
        const on = user.username === selected;
        return (
          <button
            key={user.username}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(user.username)}
            className={cn(
              "h-11 rounded-full px-4 text-sm font-semibold capitalize outline-none transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98] motion-reduce:active:scale-100",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              on ? "bg-lime text-lime-ink" : "bg-inset/70 text-dim hover:bg-inset hover:text-fg",
            )}
          >
            {user.role}
          </button>
        );
      })}
    </div>
  );
}
