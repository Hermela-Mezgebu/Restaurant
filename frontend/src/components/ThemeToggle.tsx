"use client";

import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const saved = localStorage.getItem("restaurant-theme") as Theme | null;

    if (saved === "dark" || saved === "light") {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
      return;
    }

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    const initial: Theme = prefersDark ? "dark" : "light";

    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : "light";

    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("restaurant-theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        mounted
          ? theme === "light"
            ? "Switch to dark mode"
            : "Switch to light mode"
          : "Change color theme"
      }
      title={
        mounted
          ? theme === "light"
            ? "Dark mode"
            : "Light mode"
          : "Change theme"
      }
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 hover:shadow-md dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-orange-700 dark:hover:bg-orange-950/40 dark:hover:text-orange-300"
    >
      {mounted && theme === "dark" ? (
        <FiSun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <FiMoon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
