"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api/client";

export interface HealthState {
  status: "checking" | "up" | "down";
  checkedAt: Date | null;
}

/**
 * Polls GET /health. A reply only means the FastAPI process answers; it says
 * nothing about the database or the Jina / Groq providers.
 */
export function useHealth(intervalMs = 30_000) {
  const [state, setState] = useState<HealthState>({ status: "checking", checkedAt: null });

  const check = useCallback(async () => {
    try {
      const health = await fetchHealth();
      setState({ status: health.status === "ok" ? "up" : "down", checkedAt: new Date() });
    } catch {
      setState({ status: "down", checkedAt: new Date() });
    }
  }, []);

  useEffect(() => {
    void check();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [check, intervalMs]);

  return { state, recheck: check };
}
