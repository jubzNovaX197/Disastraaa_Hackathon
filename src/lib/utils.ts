import type { Severity } from '@/types';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Safely merge Tailwind class names, resolving conflicts */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── Severity display configuration ───────────────────────────────────────────

export const severityConfig = {
  LOW: {
    label:  'Low',
    color:  'text-safe',
    bg:     'bg-safe/15',
    border: 'border-safe/30',
    dot:    'bg-safe',
  },
  MODERATE: {
    label:  'Moderate',
    color:  'text-warning',
    bg:     'bg-warning/15',
    border: 'border-warning/30',
    dot:    'bg-warning',
  },
  HIGH: {
    label:  'High',
    color:  'text-orange-400',
    bg:     'bg-orange-400/15',
    border: 'border-orange-400/30',
    dot:    'bg-orange-400',
  },
  CRITICAL: {
    label:  'Critical',
    color:  'text-critical',
    bg:     'bg-critical/15',
    border: 'border-critical/30',
    dot:    'bg-critical',
  },
} as const satisfies Record<Severity, {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}>;

// ── Formatting helpers ────────────────────────────────────────────────────────

/** Returns a human-readable relative time string */
export function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60)    return 'just now';
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Formats large numbers using Indian number system shorthands */
export function formatNumber(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}
