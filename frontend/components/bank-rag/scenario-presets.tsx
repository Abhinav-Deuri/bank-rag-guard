"use client";

import type { CSSProperties } from "react";
import { FileText, Languages, MessageSquareText, ShieldAlert, ShieldCheck, type LucideIcon } from "lucide-react";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import type { DemoUser } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  "contracts-teller": { icon: FileText, tone: "oklch(0.62 0.17 255)" },
  "contracts-compliance": { icon: ShieldCheck, tone: "oklch(0.6 0.2 295)" },
  complaints: { icon: MessageSquareText, tone: "oklch(0.68 0.17 50)" },
  injection: { icon: ShieldAlert, tone: "oklch(0.62 0.2 25)" },
  arabic: { icon: Languages, tone: "oklch(0.62 0.15 160)" },
};

/**
 * Scenario shortcuts, shown as icon tiles. They fill the question and pick the user; they never
 * submit, and the outcome is whatever the backend actually returns when the visitor clicks Ask.
 */
export function ScenarioPresets({
  users,
  activeUsername,
  activeQuestion,
  onPick,
}: {
  /** null while the user list is unavailable */
  users: DemoUser[] | null;
  activeUsername: string | null;
  activeQuestion: string;
  onPick: (scenario: Scenario) => void;
}) {
  const available = new Set(users?.map((u) => u.username));
  const unavailable = SCENARIOS.filter((s) => !available.has(s.username));

  return (
    <div>
      <p id="scenario-label" className="text-sm font-medium text-fg">
        Sample scenarios
      </p>
      <ul aria-labelledby="scenario-label" className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {SCENARIOS.map((scenario) => {
          const enabled = available.has(scenario.username);
          const active = enabled && scenario.username === activeUsername && scenario.question === activeQuestion;
          const { icon: Icon, tone } = ICONS[scenario.id] ?? ICONS.complaints;
          return (
            <li key={scenario.id} className="min-w-0">
              <button
                type="button"
                disabled={!enabled}
                aria-pressed={active}
                onClick={() => onPick(scenario)}
                className={cn(
                  "flex h-full w-full flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center text-[0.78rem] font-medium leading-tight outline-none transition-[background-color,border-color,color] duration-150 ease-out",
                  "border-line-soft bg-bg/50 text-dim hover:border-line hover:bg-inset/60 hover:text-fg",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  "disabled:pointer-events-none disabled:opacity-50",
                  active && "border-accent bg-accent/15 text-fg shadow-[0_0_12px_rgba(56,189,248,0.2)]",
                )}
              >
                <span
                  aria-hidden
                  style={{ "--tone": tone } as CSSProperties}
                  className="grid size-9 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--tone)_16%,transparent)] text-[var(--tone)]"
                >
                  <Icon className="size-[1.1rem]" />
                </span>
                <span className="text-balance">{scenario.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {users === null ? (
        <p className="mt-2 text-xs text-faint">Scenarios unlock once the user list loads.</p>
      ) : unavailable.length > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-warn">
          Unavailable: {unavailable.map((s) => `${s.label} needs ${s.username}`).join("; ")}. The backend didn&rsquo;t
          return {unavailable.length === 1 ? "that user" : "those users"}.
        </p>
      ) : null}
    </div>
  );
}
