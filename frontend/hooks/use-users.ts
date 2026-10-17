"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUsers } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { DemoUser } from "@/lib/api/types";

export type UsersState =
  | { status: "loading" }
  | { status: "ready"; users: DemoUser[] }
  | { status: "empty" }
  | { status: "error"; error: ApiError };

export function useUsers() {
  const [state, setState] = useState<UsersState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchUsers({ signal: ctrl.signal })
      .then((users) => setState(users.length ? { status: "ready", users } : { status: "empty" }))
      .catch((e: unknown) => {
        const error = e instanceof ApiError ? e : new ApiError("unknown", "Couldn't load the demo users.");
        if (error.kind !== "cancelled") setState({ status: "error", error });
      });
    return () => ctrl.abort();
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { state, reload };
}
