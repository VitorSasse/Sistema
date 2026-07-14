"use client";

import { Moon, Sun } from "lucide-react";
import { useThemePreference } from "@/hooks/use-theme-preference";

export function ThemeToggle() {
  const { preference, changePreference } = useThemePreference();

  return (
    <button
      type="button"
      className="theme-toggle-compact"
      onClick={() => changePreference(preference === "dark" ? "light" : "dark")}
      aria-label={preference === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
      title={preference === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      {preference === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
