"use client";

import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessPass } from "@/components/bank-rag/dashboard/access-pass";
import { Avatar } from "@/components/bank-rag/dashboard/avatar";
import { RoleSwitch } from "@/components/bank-rag/dashboard/role-switch";
import { BackendSetupHelp } from "@/components/bank-rag/backend-setup-help";
import { EmptyState } from "@/components/bank-rag/empty-state";
import { ErrorState } from "@/components/bank-rag/error-state";
import type { UsersState } from "@/hooks/use-users";
import type { DemoUser } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Consolidated Identity & Clearance section: combines persona switching, quick RBAC comparison,
 * and the physical security credential preview in a unified, balanced bar.
 */
export function IdentitySection({
  state,
  selectedUser,
  selected,
  onSelect,
  onReload,
}: {
  state: UsersState;
  selectedUser: DemoUser | null;
  selected: string | null;
  onSelect: (username: string) => void;
  onReload: () => void;
}) {
  return (
    <section id="users" aria-labelledby="identity-heading" className="dash-card p-5 sm:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        {/* Left: Interactive User & Persona Switcher */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="identity-heading" className="text-base font-semibold text-fg">
                  Active Demo Persona
                </h2>
                <span className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[0.7rem] font-semibold text-accent uppercase tracking-wider">
                  RBAC Enforced
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-dim max-w-xl">
                Clearance tier and masking policies are enforced server-side. Switching the active persona immediately alters retrieved document clearance and redaction rules.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 text-xs font-medium text-warn">
              No password
            </span>
          </div>

          {state.status === "loading" && (
            <div role="status" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <span className="sr-only">Loading demo users…</span>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
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
              The <code className="font-mono text-[0.85em] text-fg">users</code> table is empty, so there is nobody to ask as. It is filled by the data-preparation notebook (02) in the backend repository.
            </EmptyState>
          )}

          {state.status === "ready" && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {state.users.map((user) => {
                  const checked = user.username === selected;
                  return (
                    <button
                      key={user.username}
                      type="button"
                      onClick={() => onSelect(user.username)}
                      aria-pressed={checked}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.98]",
                        "border-line-soft bg-raised/40 hover:border-line hover:bg-raised/70",
                        checked && "border-accent bg-accent/10 shadow-[0_0_15px_rgba(56,189,248,0.12)]",
                      )}
                    >
                      <Avatar name={user.username} ring={checked} className="size-10 text-sm shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-sm font-semibold text-fg">{user.username}</span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold uppercase",
                              checked ? "bg-accent text-bg" : "bg-inset text-faint",
                            )}
                          >
                            T{user.tier}
                          </span>
                        </div>
                        <span className="block truncate text-xs text-dim capitalize">{user.role}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Clearance Comparison Switch */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line-soft">
                <span className="text-xs font-medium text-dim">Quick comparison:</span>
                <div className="flex-1 max-w-xs">
                  <RoleSwitch users={state.users} selected={selected} onSelect={onSelect} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Security Access Pass Card */}
        <div className="shrink-0 w-full sm:w-[320px] xl:w-[320px]">
          <AccessPass user={selectedUser} />
        </div>
      </div>
    </section>
  );
}
