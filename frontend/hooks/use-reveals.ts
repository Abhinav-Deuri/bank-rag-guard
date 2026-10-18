"use client";

import { useCallback, useEffect, useState } from "react";
import { listReveals } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { RevealListing } from "@/lib/api/types";

/**
 * Reveal requests for the current identity: the ones they made and the ones waiting for their decision.
 * Re-checks every few seconds while the tab is visible, so an approval made under another identity shows up.
 */
export function useReveals(username: string | null) {
  const [state, setState] = useState<{ username: string; data: RevealListing } | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!username) return;
    const ctrl = new AbortController();
    listReveals(username, { signal: ctrl.signal })
      .then((data) => {
        setState({ username, data });
        setError(null);
      })
      .catch((e: unknown) => {
        const err = e instanceof ApiError ? e : new ApiError("unknown", "Couldn't load reveal requests.");
        if (err.kind !== "cancelled") setError(err);
      });
    return () => ctrl.abort();
  }, [username, tick]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    }, 8_000);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  const data = state && state.username === username ? state.data : null;
  return { data, error, refresh };
}
