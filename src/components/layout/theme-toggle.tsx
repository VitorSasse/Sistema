"use client";

import { useThemePreference } from "@/hooks/use-theme-preference";

export function ThemeToggle() {
  const { preference, changePreference } = useThemePreference();

  return (
    <div className="theme-toggle" aria-label="Tema do sistema">
      <button
        type="button"
        className={`theme-toggle-button${preference === "dark" ? " is-active" : ""}`}
        onClick={() => changePreference("dark")}
        aria-pressed={preference === "dark"}
      >
        Escuro
      </button>
      <button
        type="button"
        className={`theme-toggle-button${preference === "light" ? " is-active" : ""}`}
        onClick={() => changePreference("light")}
        aria-pressed={preference === "light"}
      >
        Claro
      </button>
      <button
        type="button"
        className={`theme-toggle-button${preference === "system" ? " is-active" : ""}`}
        onClick={() => changePreference("system")}
        aria-pressed={preference === "system"}
      >
        Sistema
      </button>
    </div>
  );
}
