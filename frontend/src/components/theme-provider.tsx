"use client";

import * as React from "react";

type Theme = "light" | "dark";
const KEY = "legion.theme";

interface ThemeContext {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const Ctx = React.createContext<ThemeContext | null>(null);

// Read the current resolved theme from the DOM. The inline bootstrap script
// in app/layout.tsx sets the `dark` class on <html> before React mounts; we
// pick that up here so React state matches the first paint and the toggle
// button isn't out of sync on first render.
function readInitial(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(readInitial);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    try {
      window.localStorage.setItem(KEY, t);
    } catch {
      /* localStorage unavailable; ignore */
    }
  }, []);

  const toggle = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
