/**
 * Freshness Evaluation Service
 *
 * Enforces strict operational data freshness:
 * - LIVE: telemetry observed within the current operational window (< 3 hours)
 * - RECENT: observations within the last 24–48 hours
 * - STALE: observations older than 48 hours
 * - UNAVAILABLE: source failed, disconnected, or unconfigured
 *
 * CRITICAL RULE: Never label stale or unverified data as LIVE.
 */

import type { FreshnessStatus } from './types';

export interface FreshnessOptions {
  liveWindowMinutes?: number;
  recentWindowHours?: number;
}

const DEFAULT_LIVE_MINUTES = 180; // 3 hours
const DEFAULT_RECENT_HOURS = 48;  // 48 hours

export function evaluateFreshness(
  timestampIso?: string | null,
  options: FreshnessOptions = {},
): FreshnessStatus {
  if (!timestampIso) return 'UNAVAILABLE';

  const ts = new Date(timestampIso).getTime();
  if (isNaN(ts)) return 'UNAVAILABLE';

  const now = Date.now();
  const diffMs = now - ts;

  if (diffMs < 0) {
    // Future timestamp (clock skew or immediate forecast)
    return 'LIVE';
  }

  const liveMs = (options.liveWindowMinutes ?? DEFAULT_LIVE_MINUTES) * 60 * 1000;
  const recentMs = (options.recentWindowHours ?? DEFAULT_RECENT_HOURS) * 60 * 60 * 1000;

  if (diffMs <= liveMs) {
    return 'LIVE';
  }
  if (diffMs <= recentMs) {
    return 'RECENT';
  }
  return 'STALE';
}

export function formatFreshnessDescription(
  freshness: FreshnessStatus,
  sourceName: string,
  timestampIso?: string | null,
): string {
  if (freshness === 'UNAVAILABLE' || !timestampIso) {
    return `${sourceName}: Feed unavailable or standing by`;
  }

  const date = new Date(timestampIso);
  const timeFormatted = isNaN(date.getTime())
    ? 'unknown time'
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  switch (freshness) {
    case 'LIVE':
      return `${sourceName} [LIVE]: Updated at ${timeFormatted}`;
    case 'RECENT':
      return `${sourceName} [RECENT]: Observed within last 48h (${timeFormatted})`;
    case 'STALE':
      return `${sourceName} [STALE]: Historical observation (${date.toISOString().slice(0, 10)})`;
    default:
      return `${sourceName}: Telemetry standby`;
  }
}
