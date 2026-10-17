"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

// The attribute on <html> is the single source of truth; the inline script sets it first.
const getSnapshot = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const getServerSnapshot = (): Theme => "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    const apply = () => applyTheme(next);
    const doc = document as Document & {
      startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> };
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Crossfade the whole page instead of snapping, unless the visitor asked for less motion.
    // The browser may skip a transition (hidden tab, rapid toggles); the update still runs, so
    // the rejected promises are expected and safe to ignore.
    if (doc.startViewTransition && !reduce) {
      try {
        const transition = doc.startViewTransition(apply);
        transition.ready.catch(() => {});
        transition.finished.catch(() => {});
      } catch {
        apply();
      }
    } else {
      apply();
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private mode or blocked storage: the choice still applies for this visit */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(getSnapshot() === "dark" ? "light" : "dark");
  }, [setTheme]);

  // With no saved choice, keep following the system setting while the page is open.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      try {
        if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      } catch {
        /* fall through: follow the system */
      }
      applyTheme(query.matches ? "light" : "dark");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
