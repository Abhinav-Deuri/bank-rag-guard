"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const controller = useRef<AbortController | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    const id = ++seq.current;
    setState({ status: "loading" });
    try {
      const users = await fetchUsers({ signal: ctrl.signal });
      if (id !== seq.current) return;
      setState(users.length ? { status: "ready", users } : { status: "empty" });
    } catch (e) {
      if (id !== seq.current) return;
      const error = e instanceof ApiError ? e : new ApiError("unknown", "Couldn't load the demo users.");
      if (error.kind === "cancelled") return;
      setState({ status: "error", error });
    }
  }, []);

  useEffect(() => {
    void load();
    return () => controller.current?.abort();
  }, [load]);

  return { state, reload: load };
}
