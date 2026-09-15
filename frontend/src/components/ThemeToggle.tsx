'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);

    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
      document.documentElement.classList.toggle(
        'dark',
        savedTheme === 'dark'
      );
    } else {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

      const initialTheme = prefersDark ? 'dark' : 'light';

      setTheme(initialTheme);
      document.documentElement.classList.toggle(
        'dark',
        initialTheme === 'dark'
      );
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);

    document.documentElement.classList.toggle(
      'dark',
      nextTheme === 'dark'
    );
  };

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Change color theme"
        title="Change theme"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8d4d2] bg-white"
      >
        <span className="h-4 w-4 rounded-full border border-[#414846]" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Change color theme"
      title="Change theme"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8d4d2] bg-white transition hover:bg-[#f6f3f1]"
    >
      {theme === 'dark' ? (
        <span className="text-sm">☀</span>
      ) : (
        <span className="text-sm">☾</span>
      )}
    </button>
  );
}