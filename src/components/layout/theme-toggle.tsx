"use client";

import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

const storageKey = "basepro-theme";

function applyTheme(theme: ThemeMode) {
  document.body.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(storageKey);
    const initialTheme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function handleChange(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
  }

  return (
    <div className="theme-toggle" aria-label="Tema do sistema">
      <button
        type="button"
        className={`theme-toggle-button${theme === "dark" ? " is-active" : ""}`}
        onClick={() => handleChange("dark")}
        aria-pressed={theme === "dark"}
      >
        Escuro
      </button>
      <button
        type="button"
        className={`theme-toggle-button${theme === "light" ? " is-active" : ""}`}
        onClick={() => handleChange("light")}
        aria-pressed={theme === "light"}
      >
        Claro
      </button>
    </div>
  );
}
