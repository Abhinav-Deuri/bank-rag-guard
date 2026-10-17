"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EyeOff, FileText, Link2, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnswerPanel } from "@/components/bank-rag/answer-panel";
import { AuditPanel } from "@/components/bank-rag/audit-panel";
import { BackendSetupHelp } from "@/components/bank-rag/backend-setup-help";
import { deriveChain } from "@/components/bank-rag/chain-status";
import { DashboardRail } from "@/components/bank-rag/dashboard/dashboard-rail";
import { DashboardTopbar } from "@/components/bank-rag/dashboard/dashboard-topbar";
import { IdentitySection } from "@/components/bank-rag/dashboard/identity-section";
import { InsightsChart } from "@/components/bank-rag/dashboard/insights-chart";
import { LimitsCard } from "@/components/bank-rag/dashboard/limits-card";
import { QuickActions } from "@/components/bank-rag/dashboard/quick-actions";
import type { SectionId } from "@/components/bank-rag/dashboard/sections";
import { StatCard } from "@/components/bank-rag/dashboard/stat-card";
import { ErrorState } from "@/components/bank-rag/error-state";
import { QuestionComposer } from "@/components/bank-rag/question-composer";
import { ScenarioPresets } from "@/components/bank-rag/scenario-presets";
import { useAsk } from "@/hooks/use-ask";
import { useAudit } from "@/hooks/use-audit";
import { useHealth } from "@/hooks/use-health";
import { useUsers } from "@/hooks/use-users";
import type { Scenario } from "@/lib/scenarios";

export function Workspace() {
  const health = useHealth();
  const users = useUsers();
  const audit = useAudit();
  const ask = useAsk(audit.refresh);

  const [pickedUser, setPickedUser] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState("");
  const [section, setSection] = useState<SectionId>("top");
  const [greeting, setGreeting] = useState("Welcome");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const isClickScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleSelectSection = useCallback((id: SectionId) => {
    setSection(id);
    isClickScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 900);
  }, []);

  // Scroll spy: the tab and rail icon follow the section that most recently passed the reading line.
  useEffect(() => {
    const ids: SectionId[] = ["users", "ask", "insights", "audit"];
    const update = () => {
      if (isClickScrolling.current) return;
      if (window.scrollY < 80) return setSection("top");
      const line = window.innerHeight * 0.35;
      let best: SectionId = "top";
      let bestTop = -Infinity;
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line && top > bestTop) {
          best = id;
          bestTop = top;
        }
      }
      setSection(best);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  const userList = users.state.status === "ready" ? users.state.users : null;
  // Default to teller1 if the backend returned it, otherwise the first user.
  const selectedUser =
    userList?.find((u) => u.username === pickedUser) ??
    userList?.find((u) => u.username === "teller1") ??
    userList?.[0] ??
    null;
  const selected = selectedUser?.username ?? null;
  const loading = ask.state.status === "loading";
  const response = ask.state.status === "success" ? ask.state.response : null;

  const selectUser = useCallback(
    (username: string) => {
      if (username === selected) return;
      // A different user invalidates any answer or in-flight request for the old one.
      setNotice(
        loading
          ? "Switched user. The previous request was cancelled in this browser; the server may still finish it and log it."
          : null,
      );
      ask.reset();
      setPickedUser(username);
    },
    [ask, loading, selected],
  );

  const pickScenario = useCallback(
    (scenario: Scenario) => {
      setQuestion(scenario.question);
      selectUser(scenario.username);
      composerRef.current?.focus();
    },
    [selectUser],
  );

  const submit = useCallback(() => {
    if (!selected) return;
    setNotice(null);
    void ask.submit(selected, question.trim());
  }, [ask, question, selected]);

  const newQuestion = useCallback(() => {
    ask.reset();
    setQuestion("");
    setNotice(null);
    composerRef.current?.focus();
    composerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [ask]);

  const blockedReason =
    users.state.status === "loading"
      ? "Waiting for the user list…"
      : !selected
        ? "Choose a demo user first. The user list isn't available."
        : null;

  const announcement =
    ask.state.status === "loading"
      ? "Processing your question."
      : response
        ? response.blocked
          ? `Request blocked by the input guard for ${response.username}.`
          : `Answer received for ${response.username}, tier ${response.tier}, with ${response.sources.length} sources.`
        : "";

  // Stat cards: only values the API returned.
  const chain = deriveChain(audit.data, audit.error);
  const maskedTotal = response ? Object.values(response.masked_in_context).reduce((a, n) => a + n, 0) : null;
  const topMasked = response
    ? Object.entries(response.masked_in_context).sort((a, b) => b[1] - a[1])[0]
    : undefined;
  const sourcesAbove = response ? response.sources.filter((s) => s.tier > response.tier).length : 0;

  return (
    <div className="dash-scope min-h-dvh bg-dash-page p-2 sm:p-4 lg:p-6">
      <div
        id="top"
        className="mx-auto w-full max-w-[1480px] rounded-[1.75rem] bg-frame p-3 shadow-[var(--card-shadow)] ring-1 ring-[var(--card-border)] sm:p-5 lg:p-6"
      >
        <DashboardTopbar
          health={health.state}
          onRecheck={health.recheck}
          active={section}
          onSelect={handleSelectSection}
          username={selected}
        />
        {/* Floating top bar height offset */}
        <div aria-hidden className="h-[var(--dash-bar-h,7.5rem)] md:h-[var(--dash-bar-h,4.75rem)]" />

        <div
          id="main"
          className="mt-3 grid gap-6 lg:mt-5 lg:grid-cols-[3.75rem_minmax(0,1fr)]"
        >
          <DashboardRail active={section} onSelect={handleSelectSection} />

          {/* Main Disciplined Content Area */}
          <div className="space-y-6 min-w-0 lg:col-start-2">
            {/* Tier 1: System Status, Header & Consolidated Identity */}
            <div className="space-y-5">
              <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-block rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 text-xs font-medium text-warn">
                      Demo environment
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line-soft bg-raised/60 px-2.5 py-0.5 text-xs font-medium text-faint">
                      <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                      Backend on IBM LinuxONE
                    </span>
                  </div>
                  <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-[2.1rem]">
                    {greeting}{selected ? `, ${selected}` : ""}
                  </h1>
                  <p className="max-w-prose text-[0.95rem] leading-relaxed text-dim">
                    Ask about bank documents, then inspect what the server masked and cryptographically recorded. All data is synthetic or public.
                  </p>
                </div>
              </header>

              {health.state.status === "down" && users.state.status !== "ready" ? (
                <BackendSetupHelp />
              ) : null}

              {/* Consolidated Identity Section */}
              <IdentitySection
                state={users.state}
                selectedUser={selectedUser}
                selected={selected}
                onSelect={selectUser}
                onReload={users.reload}
              />
            </div>

            {/* Tier 2: Core Interactive Hub (Two-Column Grid) */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              {/* Left: Ask Assistant, Presets & Answer Panel */}
              <div id="ask" className="space-y-6 min-w-0">
                <section aria-labelledby="ask-heading" className="dash-card p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 id="ask-heading" className="text-base font-semibold text-fg">
                        Ask the assistant
                      </h2>
                      <p className="mt-0.5 text-sm text-dim">
                        Query bank documents as <span className="font-semibold text-fg">{selected ?? "a demo user"}</span>.
                      </p>
                    </div>
                    <Button variant="primary" size="sm" className="rounded-full" onClick={newQuestion}>
                      New
                      <Plus className="size-4" aria-hidden />
                    </Button>
                  </div>

                  <div className="mt-5 space-y-5">
                    <ScenarioPresets
                      users={userList}
                      activeUsername={selected}
                      activeQuestion={question}
                      onPick={pickScenario}
                    />
                    <QuestionComposer
                      ref={composerRef}
                      value={question}
                      onChange={setQuestion}
                      onSubmit={submit}
                      loading={loading}
                      blockedReason={blockedReason}
                      username={selected}
                    >
                      <AnimatePresence initial={false}>
                        {notice ? (
                          <motion.p
                            key="notice"
                            role="status"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-xs leading-relaxed text-warn"
                          >
                            {notice}
                          </motion.p>
                        ) : null}
                        {ask.state.status === "error" ? (
                          <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <ErrorState
                              tone={
                                ask.state.error.kind === "rate_limited" || ask.state.error.kind === "timeout"
                              ? "warn"
                              : "bad"
                              }
                              title={
                                ask.state.error.kind === "rate_limited"
                                  ? "Request limit reached"
                                  : ask.state.error.kind === "timeout"
                                    ? "No answer yet"
                                    : ask.state.error.kind === "unreachable"
                                      ? "Backend not reachable"
                                      : "The question couldn't be answered"
                              }
                              action={
                                <Button size="sm" variant="secondary" onClick={() => composerRef.current?.focus()}>
                                  Edit and try again
                                </Button>
                              }
                            >
                              {ask.state.error.message}
                            </ErrorState>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </QuestionComposer>
                  </div>
                </section>

                <div id="answer">
                  <div aria-live="polite" className="sr-only">
                    {announcement}
                  </div>
                  <AnswerPanel state={ask.state} />
                </div>
              </div>

              {/* Right: Security Metrics Telemetry & Screening Insights */}
              <div id="insights" className="space-y-6 min-w-0">
                <div className="grid grid-cols-2 gap-4" aria-label="Query Security Metrics">
                  <StatCard
                    icon={ShieldCheck}
                    tone="oklch(0.6 0.2 295)"
                    label="Clearance"
                    value={selectedUser ? `Tier ${selectedUser.tier}` : "—"}
                    hint={selectedUser ? `${selectedUser.role}, applied by server` : "No user selected"}
                  />
                  <StatCard
                    icon={FileText}
                    tone="oklch(0.62 0.17 255)"
                    label="Sources"
                    loading={loading}
                    value={response ? response.sources.length : "—"}
                    hint={
                      response
                        ? response.blocked
                          ? "Blocked before retrieval"
                          : response.sources.length === 0
                            ? "None returned"
                            : sourcesAbove > 0
                              ? `${sourcesAbove} above Tier ${response.tier}`
                              : `All at or below Tier ${response.tier}`
                        : "Ask a question"
                    }
                    hintTone={response && sourcesAbove > 0 ? "bad" : response && response.sources.length > 0 ? "ok" : "muted"}
                  />
                  <StatCard
                    icon={EyeOff}
                    tone="oklch(0.68 0.17 50)"
                    label="Masked"
                    loading={loading}
                    value={maskedTotal ?? "—"}
                    hint={
                      response
                        ? maskedTotal === 0
                          ? "No masking matches reported"
                          : topMasked
                            ? `Most: ${topMasked[0]} × ${topMasked[1]}`
                            : ""
                        : "In retrieved passages"
                    }
                  />
                  <StatCard
                    icon={Link2}
                    tone={chain === "intact" ? "var(--ok)" : chain === "broken" ? "var(--bad)" : "var(--warn)"}
                    label="Audit chain"
                    loading={chain === "loading"}
                    value={chain === "intact" ? "Intact" : chain === "broken" ? "Broken" : "Unknown"}
                    hint={
                      chain === "unknown"
                        ? "The last check failed"
                        : (audit.data?.message ?? "Checking…")
                    }
                    hintTone={chain === "intact" ? "ok" : chain === "broken" ? "bad" : "warn"}
                  />
                </div>

                <InsightsChart response={response} loading={loading} />
              </div>
            </div>

            {/* Tier 3: Cryptographic Audit Trail, Limits & Governance */}
            <div id="audit" className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              {/* Left: Tamper-evident Audit Panel */}
              <div className="min-w-0">
                <AuditPanel
                  data={audit.data}
                  error={audit.error}
                  loading={audit.loading}
                  checkedAt={audit.checkedAt}
                  onRefresh={audit.refresh}
                  filter={auditFilter}
                  onFilterChange={setAuditFilter}
                />
              </div>

              {/* Right: Quick Governance Actions & System Limits */}
              <div className="space-y-6 min-w-0">
                <QuickActions
                  onNew={newQuestion}
                  onRefreshAudit={audit.refresh}
                  onClear={ask.reset}
                  refreshing={audit.loading}
                  canClear={ask.state.status !== "idle"}
                />
                <LimitsCard />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
