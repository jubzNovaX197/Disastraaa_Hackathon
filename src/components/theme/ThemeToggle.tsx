'use client';

/**
 * ThemeToggle — accessible button for switching between Dark and Light mode.
 * Adapts to navbar or map overlay placement.
 */

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ThemeToggle({
  className,
  showLabel = false,
  size = 'md',
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-200 select-none',
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs',
        isDark
          ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-slate-100 border border-white/10'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300/80 shadow-sm',
        className,
      )}
    >
      {isDark ? (
        <>
          <Sun className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4', 'text-amber-400 animate-fade-in')} />
          {showLabel && <span>Light Mode</span>}
        </>
      ) : (
        <>
          <Moon className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4', 'text-indigo-600 animate-fade-in')} />
          {showLabel && <span>Dark Mode</span>}
        </>
      )}
    </button>
  );
}
