"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAudit } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { AuditResponse } from "@/lib/api/types";

/**
 * Audit state is deliberately separate from the question flow, so an audit
 * failure never replaces a good answer (and vice versa).
 */
export function useAudit() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const controller = useRef<AbortController | null>(null);
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    const id = ++seq.current;
    setLoading(true);
    try {
      const result = await fetchAudit({ signal: ctrl.signal });
      if (id !== seq.current) return;
      setData(result);
      setError(null);
      setCheckedAt(new Date());
    } catch (e) {
      if (id !== seq.current) return;
      const err = e instanceof ApiError ? e : new ApiError("unknown", "Couldn't read the audit log.");
      if (err.kind === "cancelled") return;
      setError(err);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => controller.current?.abort();
  }, [refresh]);

  return { data, error, loading, checkedAt, refresh };
}
