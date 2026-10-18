"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { useAudit } from "@/hooks/use-audit";
import type { useUsers } from "@/hooks/use-users";
import { cn } from "@/lib/utils";

type UsersState = ReturnType<typeof useUsers>["state"];
type Audit = ReturnType<typeof useAudit>;
type Status = "wait" | "ok" | "warn" | "fail";

const SEEN_KEY = "aegis-boot-seen";

function seenBefore() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private mode or storage blocked: the start-up screen just plays again next time */
  }
}

/** "AEGIS-Z" in block letters (figlet, ANSI Shadow): solid blocks in white, the shading in Monokai pink. */
const BANNER = [" █████╗ ███████╗ ██████╗ ██╗███████╗     ███████╗", "██╔══██╗██╔════╝██╔════╝ ██║██╔════╝     ╚══███╔╝", "███████║█████╗  ██║  ███╗██║███████╗█████╗ ███╔╝ ", "██╔══██║██╔══╝  ██║   ██║██║╚════██║╚════╝███╔╝  ", "██║  ██║███████╗╚██████╔╝██║███████║     ███████╗", "╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝╚══════╝     ╚══════╝"];

function Banner() {
  return (
    <pre aria-hidden className="boot-banner mb-5 leading-none">
      {BANNER.map((line, i) => (
        <span key={i} className="block">
          {Array.from(line).map((ch, j) =>
            ch === "█" ? (
              <span key={j} className="text-fg">{ch}</span>
            ) : ch === " " ? (
              " "
            ) : (
              <span key={j} className="t-prompt">{ch}</span>
            ),
          )}
        </span>
      ))}
    </pre>
  );
}

/**
 * The workspace's start-up screen. The screen powers on like a CRT, then prints real checks: the
 * backend answering, the demo identities loading, and the whole audit chain being verified, with
 * the numbers that came back. A failure stops on [FAIL] instead of hiding it.
 * Any key or click skips it. It plays once per browser (an inline script in the root layout hides it before paint on later
 * visits; the boot command replays it), and is plain
 * (no power-on effect) with reduced motion.
 */
export function BootScreen({ users, audit }: { users: UsersState; audit: Audit }) {
  const [shown, setShown] = useState(1);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  const backend: Status = users.status === "ready" || users.status === "empty" ? "ok" : users.status === "error" ? "fail" : "wait";
  const ids: Status = users.status === "ready" ? "ok" : users.status === "empty" ? "warn" : users.status === "error" ? "fail" : "wait";
  const chain: Status = audit.data ? (audit.data.ok ? "ok" : "fail") : audit.error ? "fail" : "wait";
  const entries = audit.data?.message.match(/all (\d+) entries/)?.[1];

  const lines: { label: string; status: Status; detail?: string }[] = [
    {
      label: "Connecting to the backend",
      status: backend,
      detail: backend === "fail" && users.status === "error" ? users.error.message : undefined,
    },
    {
      label: "Loading demo identities",
      status: ids,
      detail: users.status === "ready" ? `${users.users.length} found` : users.status === "empty" ? "none yet" : undefined,
    },
    {
      label: "Verifying the audit chain",
      status: chain,
      detail: audit.data
        ? audit.data.ok
          ? `${entries ?? "all"} entries intact`
          : audit.data.message
        : audit.error
          ? audit.error.message
          : undefined,
    },
    { label: "Clearance filter, masking and guard", status: backend === "ok" ? "ok" : backend, detail: "on" },
  ];

  const failed = lines.slice(0, shown).some((l) => l.status === "fail");
  const current = lines[shown - 1];
  const finished = shown >= lines.length && lines.every((l) => l.status !== "wait");

  // Print the next line once the current check has an answer.
  useEffect(() => {
    if (gone || leaving || failed || !current || current.status === "wait" || shown >= lines.length) return;
    const quick = seenBefore() || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setShown((n) => n + 1), quick ? 60 : 340);
    return () => window.clearTimeout(t);
  }, [current, failed, gone, leaving, lines.length, shown]);

  // Leave on its own when everything is done, or at once when the person skips.
  useEffect(() => {
    if (gone) return;
    const leave = () => {
      markSeen();
      setLeaving(true);
      window.setTimeout(() => setGone(true), 320);
    };
    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.metaKey || e.ctrlKey || e.altKey)) return;
      leave();
    };
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    const t = finished && !failed ? window.setTimeout(leave, seenBefore() ? 200 : 900) : 0;
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      window.clearTimeout(t);
    };
  }, [finished, failed, gone]);

  if (gone) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("boot-screen term fixed inset-0 z-50 flex items-center justify-center px-5", leaving && "boot-leaving")}
    >
      <div className="w-full max-w-[64ch]">
        <Banner />
        <p className="text-fg">
          <span className="sr-only">AEGIS-Z, </span>
          <span className="text-dim">Bank document assistant on IBM LinuxONE</span>
        </p>
        <p className="text-[13px] text-faint">Starting a demo session. <span className="pointer-coarse:hidden">Press any key to skip.</span><span className="hidden pointer-coarse:inline">Tap to skip.</span></p>
        <ol className="mt-5 space-y-1">
          {lines.slice(0, shown).map((l, i) => (
            <li key={l.label} className="boot-line" style={{ "--i": i } as CSSProperties}>
              <div className="flex items-baseline gap-2">
                <span className="text-dim">{l.label}</span>
                <span aria-hidden className="min-w-4 flex-1 overflow-hidden whitespace-nowrap text-line">
                  {".".repeat(80)}
                </span>
                {l.detail && l.status !== "fail" && <span className="num shrink-0 text-fg">{l.detail}</span>}
                <span
                  className={cn(
                    "shrink-0 whitespace-pre",
                    l.status === "ok" && "text-ok",
                    l.status === "warn" && "text-warn",
                    l.status === "fail" && "text-bad",
                    l.status === "wait" && "boot-wait text-accent",
                  )}
                >
                  {l.status === "ok" ? "[ OK ]" : l.status === "warn" ? "[WARN]" : l.status === "fail" ? "[FAIL]" : "[ .. ]"}
                </span>
              </div>
              {l.status === "fail" && l.detail && <p className="ms-2 mt-0.5 text-[13px] text-bad">{l.detail}</p>}
            </li>
          ))}
        </ol>
        {failed && (
          <p className="mt-5 text-dim">
            Something isn’t answering. Press any key to open the workspace anyway; it will show what is missing.
          </p>
        )}
        {finished && !failed && <p className="mt-5 text-ok">Ready.</p>}
      </div>
    </div>
  );
}
