'use client';

/**
 * ThemeContext — manages Dark / Light mode across the entire application,
 * persisting preference to localStorage and synchronizing document classes
 * and MapLibre basemap styles.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    // Read user preference from localStorage or OS settings
    const saved = localStorage.getItem('disastraaa-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      const initial: Theme = prefersLight ? 'light' : 'dark';
      setThemeState(initial);
      applyTheme(initial);
    }
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(t);
    root.setAttribute('data-theme', t);
    root.style.colorScheme = t;
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem('disastraaa-theme', t);
    } catch {
      // Ignore storage errors in private browsing
    }
    applyTheme(t);
  };

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
