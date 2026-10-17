"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAudit } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { AuditResponse } from "@/lib/api/types";

/**
 * Audit state is deliberately separate from the question flow, so an audit
 * failure never replaces a good answer (and vice versa). `refresh` starts a new
 * check; an older check still in flight is cancelled.
 */
export function useAudit() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAudit({ signal: ctrl.signal })
      .then((result) => {
        setData(result);
        setError(null);
        setCheckedAt(new Date());
        setLoading(false);
      })
      .catch((e: unknown) => {
        const err = e instanceof ApiError ? e : new ApiError("unknown", "Couldn't read the audit log.");
        if (err.kind === "cancelled") return;
        setError(err);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [attempt]);

  const refresh = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  return { data, error, loading, checkedAt, refresh };
}
