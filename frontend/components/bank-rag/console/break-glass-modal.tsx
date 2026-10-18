"use client";

import { useEffect, useState } from "react";
import { approveBreakGlass, fetchFactSheet } from "@/lib/api/client";
import type { DemoUser, FactSheetResponse, VaultToken } from "@/lib/api/types";
import { KeyRound, ShieldCheck, FileCheck2, Lock, Unlock, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const SAR_PRESETS = [
  "AML SAR #4092: Cross-border shell company trace (UAE PDPL Art. 7 Exception)",
  "CBUAE Sanctions Evasion Alert: High-value disputed card / wire investigation",
  "Internal Fraud Audit #881: Customer identity & IBAN settlement verification",
];

export function BreakGlassModal({
  token,
  currentUser,
  users,
  onClose,
  onUnmasked,
  onAuditRefresh,
}: {
  token: VaultToken;
  currentUser: DemoUser | null;
  users: DemoUser[];
  onClose: () => void;
  onUnmasked: (tokenId: string, plaintext: string) => void;
  onAuditRefresh?: () => void;
}) {
  const complianceUser = users.find((u) => u.role === "compliance" || u.tier >= 3)?.username ?? "compliance1";
  const [justification, setJustification] = useState(SAR_PRESETS[0]);
  const [approver, setApprover] = useState(complianceUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ plaintext: string; auditHash?: string; hsmKey?: string } | null>(null);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await approveBreakGlass({
        token_id: token.token_id,
        requested_by: currentUser?.username ?? "teller1",
        approved_by: approver,
        justification: justification.trim(),
      });
      setResult({
        plaintext: res.plaintext,
        auditHash: res.audit_hash,
        hsmKey: res.hsm_key_id,
      });
      onUnmasked(token.token_id, res.plaintext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute break-glass unmasking.");
      onAuditRefresh?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-panel p-6 text-fg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bg-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line-soft pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-warn/40 bg-warn/10 text-warn">
              <KeyRound className="size-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-warn">
                Pivot 2 · IBM Hyper Protect Crypto Services (KYOK)
              </span>
              <h3 id="bg-modal-title" className="text-base font-semibold text-fg">
                Just-in-Time Cryptographic Break-Glass
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-dim hover:bg-surface hover:text-fg"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-line-soft bg-surface/60 p-3.5 font-mono text-xs">
            <div>
              <div className="text-faint">Deterministic Token</div>
              <div className="mt-0.5 font-semibold text-accent">{token.token_id}</div>
            </div>
            <div>
              <div className="text-faint">Entity Category</div>
              <div className="mt-0.5 font-semibold text-fg">{token.label}</div>
            </div>
            <div>
              <div className="text-faint">Requesting Investigator</div>
              <div className="mt-0.5 text-fg">
                {currentUser?.username ?? "teller1"} (Tier {currentUser?.tier ?? 1})
              </div>
            </div>
            <div>
              <div className="text-faint">LLM Exposure</div>
              <div className="mt-0.5 text-ok">Zero (Blind to Cleartext)</div>
            </div>
          </div>

          {!result ? (
            <form onSubmit={handleApprove} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-dim mb-1.5">
                  AML / SAR Regulatory Justification (logged into SHA-256 chain)
                </label>
                <textarea
                  rows={2}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                  required
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {SAR_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setJustification(preset)}
                      className="rounded-md border border-line-soft bg-surface px-2 py-0.5 text-[11px] text-dim hover:border-accent/50 hover:text-fg"
                    >
                      Preset #{i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-dim mb-1.5">
                  Dual-Custody Co-Signing Authority (IBM Verify Step-Up)
                </label>
                <select
                  value={approver}
                  onChange={(e) => setApprover(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                >
                  {users.map((u) => (
                    <option key={u.username} value={u.username}>
                      {u.username} — role: {u.role} (Tier {u.tier})
                      {u.role === "compliance" || u.tier >= 3 ? " ✓ Authorized Co-Signer" : " ✗ Insufficient Authority"}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-faint">
                  Try selecting <code className="text-dim">teller1</code> to verify that single-custody / low-tier self-approval is rejected.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-bad/40 bg-bad/10 p-3 text-xs text-bad">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-medium text-dim hover:text-fg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-bg hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
                >
                  <Unlock className="size-3.5" />
                  {loading ? "Verifying HSM Co-Signature…" : "Co-Sign & Unmask Token"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-ok/40 bg-ok/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-ok">
                  <CheckCircle2 className="size-4" />
                  Dual-Custody Unmasking Approved & Committed to SHA-256 Chain
                </div>
                <div className="mt-2.5 rounded-lg border border-ok/30 bg-bg/90 p-3 font-mono text-sm font-semibold text-fg">
                  {result.plaintext}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-dim">
                  <span>HSM Key: {result.hsmKey ?? "IBM-HPCS-KYOK-01"}</span>
                  {result.auditHash && <span>SHA-256 Block: {result.auditHash.slice(0, 16)}…</span>}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-bg hover:bg-accent/90 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function FactSheetModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<FactSheetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchFactSheet()
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to generate FactSheet");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const downloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.factsheet_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-line bg-panel text-fg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fs-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 text-accent">
              <FileCheck2 className="size-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-accent">
                Pivot 5 · IBM watsonx.governance & OpenPages
              </span>
              <h3 id="fs-modal-title" className="text-base font-semibold text-fg">
                Automated Regulatory Compliance FactSheet (CBUAE & Basel III)
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-dim hover:bg-surface hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
          {loading && <p className="text-dim">Generating live cryptographic attestation from SHA-256 ledger…</p>}
          {error && <p className="text-bad">{error}</p>}
          {data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-line-soft bg-surface/60 p-3.5 font-mono text-xs">
                <div>
                  <div className="text-faint">Certificate ID</div>
                  <div className="mt-0.5 font-semibold text-accent">{data.factsheet_id}</div>
                </div>
                <div>
                  <div className="text-faint">Hash Chain Integrity</div>
                  <div className={cn("mt-0.5 font-semibold", data.chain_verified ? "text-ok" : "text-bad")}>
                    {data.chain_verified ? "VERIFIED (100%)" : "BROKEN"}
                  </div>
                </div>
                <div>
                  <div className="text-faint">PII Tokens Vaulted</div>
                  <div className="mt-0.5 font-semibold text-fg">{data.metrics.vault_tokens_protected ?? 0}</div>
                </div>
                <div>
                  <div className="text-faint">Attacks Blocked</div>
                  <div className="mt-0.5 font-semibold text-warn">{data.metrics.questions_blocked ?? 0}</div>
                </div>
              </div>

              <div className="space-y-2.5">
                {data.controls.map((c) => (
                  <div key={c.control_id} className="rounded-xl border border-line-soft bg-surface/40 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-accent">{c.control_id}</span>
                      <span className="rounded-full border border-ok/40 bg-ok/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-ok">
                        {c.status}
                      </span>
                    </div>
                    <div className="mt-1 font-medium text-fg text-xs">{c.framework}</div>
                    <p className="mt-1 text-xs text-dim">{c.mechanism}</p>
                    <p className="mt-1 font-mono text-[11px] text-faint">Evidence: {c.evidence}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-line-soft bg-bg p-3 font-mono text-[11px] text-faint space-y-1">
                <div className="text-dim font-semibold">IBM Quantum-Safe Attestation Signature (CRYSTALS-Dilithium / ML-DSA):</div>
                <div className="break-all text-accent">{data.pqc_signature}</div>
                <div className="break-all">Ledger Head SHA-256: {data.chain_head_hash}</div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-line px-6 py-3.5 shrink-0 bg-panel">
          {data && (
            <button
              type="button"
              onClick={downloadJson}
              className="rounded-xl border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/20 cursor-pointer"
            >
              Export Signed JSON Certificate
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-bg hover:bg-accent/90 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
