"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EyeOff, FileText, Link2, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnswerPanel } from "@/components/bank-rag/answer-panel";
import { AuditPanel } from "@/components/bank-rag/audit-panel";
import { BackendSetupHelp } from "@/components/bank-rag/backend-setup-help";
import { deriveChain } from "@/components/bank-rag/chain-status";
import { AccessPass } from "@/components/bank-rag/dashboard/access-pass";
import { DashboardRail } from "@/components/bank-rag/dashboard/dashboard-rail";
import { DashboardTopbar } from "@/components/bank-rag/dashboard/dashboard-topbar";
import { InsightsChart } from "@/components/bank-rag/dashboard/insights-chart";
import { LimitsCard } from "@/components/bank-rag/dashboard/limits-card";
import { QuickActions } from "@/components/bank-rag/dashboard/quick-actions";
import { RoleSwitch } from "@/components/bank-rag/dashboard/role-switch";
import { SearchPill } from "@/components/bank-rag/dashboard/search-pill";
import type { SectionId } from "@/components/bank-rag/dashboard/sections";
import { StatCard } from "@/components/bank-rag/dashboard/stat-card";
import { DemoUserSelector } from "@/components/bank-rag/demo-user-selector";
import { ErrorState } from "@/components/bank-rag/error-state";
import { QuestionComposer } from "@/components/bank-rag/question-composer";
import { ScenarioPresets } from "@/components/bank-rag/scenario-presets";
import { useAsk } from "@/hooks/use-ask";
import { useAudit } from "@/hooks/use-audit";
import { useHealth } from "@/hooks/use-health";
import { useUsers } from "@/hooks/use-users";
import type { Scenario } from "@/lib/scenarios";
import { cn } from "@/lib/utils";

/**
 * Grid item. Below `xl` the main column and the side column are flattened into one list (their
 * wrappers use `display: contents`), so `order` decides what comes first on small screens: the
 * user picker before the question, the audit last. From `xl` up the two columns are real grids and
 * the order classes drop out.
 */
function Item({
  order,
  id,
  className,
  children,
}: {
  order: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className={cn(order, "min-w-0 lg:col-start-2 xl:order-none xl:col-auto", className)}>
      {children}
    </div>
  );
}

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

  // Scroll spy: the tab and rail icon follow the section that most recently passed the reading line.
  useEffect(() => {
    const ids: SectionId[] = ["ask", "users", "insights", "audit"];
    const update = () => {
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
          onSelect={setSection}
          username={selected}
        />
        {/* The top bar floats (fixed), so reserve its height in the flow. */}
        <div aria-hidden className="h-[var(--dash-bar-h,7.5rem)] md:h-[var(--dash-bar-h,4.75rem)]" />

        <div
          id="main"
          className="mt-3 grid gap-5 lg:mt-4 lg:grid-cols-[3.75rem_minmax(0,1fr)] xl:grid-cols-[3.75rem_minmax(0,1fr)_21.5rem]"
        >
          <DashboardRail active={section} onSelect={setSection} />

          {/* Main column */}
          <div className="contents xl:col-start-2 xl:grid xl:min-w-0 xl:content-start xl:gap-5">
            <Item order="order-1" className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div className="min-w-0 space-y-1.5">
                <span className="inline-block rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 text-xs font-medium text-warn">
                  Demo environment
                </span>
                <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-[2.1rem]">
                  {greeting}
                  {selected ? `, ${selected}` : ""}
                </h1>
                <p className="max-w-prose text-[0.95rem] leading-relaxed text-dim">
                  Ask about bank documents, then check what the server applied and what it logged. All data is
                  synthetic or public.
                </p>
              </div>
              <SearchPill value={auditFilter} onChange={setAuditFilter} />
            </Item>

            {health.state.status === "down" && users.state.status !== "ready" ? (
              <Item order="order-2">
                <BackendSetupHelp />
              </Item>
            ) : null}

            {/* Ask card + stats */}
            <Item order="order-3" id="ask">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                <section aria-labelledby="ask-heading" className="dash-card p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 id="ask-heading" className="text-base font-semibold">
                        Ask the assistant
                      </h2>
                      <p className="mt-0.5 text-sm text-dim">One question at a time, as {selected ?? "a demo user"}.</p>
                    </div>
                    <Button variant="lime" size="sm" className="rounded-full" onClick={newQuestion}>
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

                <div className="grid grid-cols-2 content-start gap-4" aria-label="Summary">
                  <StatCard
                    icon={ShieldCheck}
                    tone="oklch(0.6 0.2 295)"
                    label="Clearance"
                    value={selectedUser ? `Tier ${selectedUser.tier}` : "—"}
                    hint={selectedUser ? `${selectedUser.role}, applied by the server` : "No user selected"}
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
              </div>
            </Item>

            <Item order="order-4" id="answer">
              <div aria-live="polite" className="sr-only">
                {announcement}
              </div>
              <AnswerPanel state={ask.state} />
            </Item>

            <Item order="order-5">
              <InsightsChart response={response} loading={loading} />
            </Item>
          </div>

          {/* Side column */}
          <div className="contents xl:col-start-3 xl:row-start-1 xl:grid xl:min-w-0 xl:content-start xl:gap-5">
            <Item order="order-2" id="users">
              <DemoUserSelector state={users.state} selected={selected} onSelect={selectUser} onReload={users.reload} />
            </Item>
            <Item order="order-6" className="space-y-4">
              <AccessPass user={selectedUser} />
              <RoleSwitch users={userList} selected={selected} onSelect={selectUser} />
            </Item>
            <Item order="order-7">
              <QuickActions
                onNew={newQuestion}
                onRefreshAudit={audit.refresh}
                onClear={ask.reset}
                refreshing={audit.loading}
                canClear={ask.state.status !== "idle"}
              />
            </Item>
            <Item order="order-8" id="audit">
              <AuditPanel
                data={audit.data}
                error={audit.error}
                loading={audit.loading}
                checkedAt={audit.checkedAt}
                onRefresh={audit.refresh}
                filter={auditFilter}
                onFilterChange={setAuditFilter}
              />
            </Item>
            <Item order="order-9">
              <LimitsCard />
            </Item>
          </div>
        </div>
      </div>
    </div>
  );
}
