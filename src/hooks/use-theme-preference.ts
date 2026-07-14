"use client";

import { useEffect, useState } from "react";

export type ThemePreference = "dark" | "light" | "system";

const storageKey = "basepro-theme";
const themeEvent = "basepro-theme-change";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system";
}

function resolveTheme(preference: ThemePreference) {
  if (preference !== "system") {
    return preference;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(preference: ThemePreference) {
  document.body.dataset.theme = resolveTheme(preference);
}

export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const initialPreference = isThemePreference(saved) ? saved : "dark";
    const media = window.matchMedia("(prefers-color-scheme: light)");

    setPreference(initialPreference);
    applyTheme(initialPreference);

    function handleSystemChange() {
      const current = window.localStorage.getItem(storageKey);
      if (current === "system") {
        applyTheme("system");
      }
    }

    function handleThemeEvent(event: Event) {
      const next = (event as CustomEvent<ThemePreference>).detail;
      if (isThemePreference(next)) {
        setPreference(next);
        applyTheme(next);
      }
    }

    media.addEventListener("change", handleSystemChange);
    window.addEventListener(themeEvent, handleThemeEvent);

    return () => {
      media.removeEventListener("change", handleSystemChange);
      window.removeEventListener(themeEvent, handleThemeEvent);
    };
  }, []);

  function changePreference(next: ThemePreference) {
    window.localStorage.setItem(storageKey, next);
    setPreference(next);
    applyTheme(next);
    window.dispatchEvent(new CustomEvent(themeEvent, { detail: next }));
  }

  return { preference, changePreference };
}
