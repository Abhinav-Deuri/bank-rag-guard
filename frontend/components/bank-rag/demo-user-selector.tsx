"use client";

import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/bank-rag/dashboard/avatar";
import { BackendSetupHelp } from "@/components/bank-rag/backend-setup-help";
import { EmptyState } from "@/components/bank-rag/empty-state";
import { ErrorState } from "@/components/bank-rag/error-state";
import type { UsersState } from "@/hooks/use-users";
import { cn } from "@/lib/utils";

/**
 * Demo identity switcher, laid out like the "quick send" avatar row of a dashboard. It is not a
 * sign-in: there is no password, and the server applies the selected user's tier.
 */
export function DemoUserSelector({
  state,
  selected,
  onSelect,
  onReload,
}: {
  state: UsersState;
  selected: string | null;
  onSelect: (username: string) => void;
  onReload: () => void;
}) {
  return (
    <section aria-labelledby="demo-user-heading" className="dash-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 id="demo-user-heading" className="text-base font-semibold">
          Choose demo user
        </h2>
        <span className="shrink-0 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 text-xs font-medium text-warn">
          No password
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-faint">
        An identity switcher, not a sign-in. The server applies the selected user&rsquo;s clearance tier; nothing here can
        change it.
      </p>

      <div className="mt-4">
        {state.status === "loading" && (
          <div role="status" className="grid grid-cols-3 gap-2">
            <span className="sr-only">Loading demo users…</span>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[6.75rem] rounded-2xl" />
            ))}
          </div>
        )}

        {state.status === "error" && (
          <div className="space-y-3">
            <ErrorState
              title="Couldn't load the demo users"
              action={
                <Button size="sm" variant="secondary" onClick={onReload}>
                  Try again
                </Button>
              }
            >
              {state.error.message}
            </ErrorState>
            {state.error.kind === "unreachable" || state.error.kind === "timeout" ? <BackendSetupHelp /> : null}
          </div>
        )}

        {state.status === "empty" && (
          <EmptyState
            icon={<UserRound />}
            title="The backend returned no demo users"
            action={
              <Button size="sm" variant="secondary" onClick={onReload}>
                Check again
              </Button>
            }
          >
            The <code className="font-mono text-[0.85em] text-fg">users</code> table is empty, so there is nobody to ask
            as. It is filled by the data-preparation notebook (02) in the backend repository.
          </EmptyState>
        )}

        {state.status === "ready" && (
          <fieldset>
            <legend className="sr-only">Demo user</legend>
            <div className="grid grid-cols-3 gap-2">
              {state.users.map((user) => {
                const checked = user.username === selected;
                return (
                  <label key={user.username} className="group relative block cursor-pointer">
                    <input
                      type="radio"
                      name="demo-user"
                      value={user.username}
                      checked={checked}
                      onChange={() => onSelect(user.username)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "flex h-full flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-3 text-center transition-[background-color,border-color] duration-150 ease-out",
                        "border-transparent group-hover:bg-inset/70",
                        "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                        checked && "border-line bg-inset/80",
                      )}
                    >
                      <Avatar name={user.username} ring={checked} className="size-12 text-base" />
                      <span className="w-full truncate text-[0.8rem] font-medium text-fg">{user.username}</span>
                      <span className="num text-xs text-dim">
                        <span className="capitalize">{user.role}</span> · T{user.tier}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>
    </section>
  );
}
