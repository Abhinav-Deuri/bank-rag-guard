"use client";

import { useEffect, useState } from "react";

/** Whole seconds since `startedAt`, ticking once a second. */
export function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
}
