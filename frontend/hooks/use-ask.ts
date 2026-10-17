"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { askQuestion } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { AskResponse } from "@/lib/api/types";

export type AskState =
  | { status: "idle" }
  | { status: "loading"; username: string; question: string; startedAt: number }
  | { status: "success"; username: string; question: string; response: AskResponse }
  | { status: "error"; username: string; question: string; error: ApiError };

/**
 * One question at a time. The username is captured at submit time, a newer
 * request or a reset makes older results stale, and POSTs are never retried
 * automatically (a timeout does not prove the server stopped).
 */
export function useAsk(onSettled: () => void) {
  const [state, setState] = useState<AskState>({ status: "idle" });
  const seq = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const settledRef = useRef(onSettled);

  useEffect(() => {
    settledRef.current = onSettled;
  }, [onSettled]);

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    seq.current += 1;
    busy.current = false;
    setState({ status: "idle" });
  }, []);

  const submit = useCallback(async (username: string, question: string) => {
    if (busy.current) return;
    busy.current = true;
    const id = ++seq.current;
    const ctrl = new AbortController();
    controller.current = ctrl;
    setState({ status: "loading", username, question, startedAt: Date.now() });

    try {
      const response = await askQuestion({ username, question }, { signal: ctrl.signal });
      if (id === seq.current) setState({ status: "success", username, question, response });
    } catch (e) {
      const error = e instanceof ApiError ? e : new ApiError("unknown", "Something unexpected happened.");
      if (id === seq.current && error.kind !== "cancelled") {
        setState({ status: "error", username, question, error });
      }
    } finally {
      if (id === seq.current) {
        busy.current = false;
        controller.current = null;
      }
      // The server may have logged events even when the request failed or was abandoned.
      settledRef.current();
    }
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  return { state, submit, reset };
}
