/**
 * Authoritative Real Alert Store & Aggregator
 *
 * Coordinates real-time emergency alert feeds across:
 * - India Meteorological Department (IMD / NWFC) via WMO CAP-Alert Hub
 * - NDMA SACHET National Disaster Alert Portal (with documented WAF status)
 *
 * Implements in-memory TTL caching, clean isolation, and strict no-fabrication policy.
 */

import { imdCapClient, IMD_RSS_ENDPOINT } from './imdCapClient';
import { sachetClient, SACHET_FEED_URL } from './sachetClient';
import type { RealAlert, FeedStatusRecord, RealAlertQueryResult } from './types';
import type { DemoAlert } from '@/data/types';

interface CachedSnapshot {
  snapshot: RealAlertQueryResult;
  fetchedAt: number;
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes TTL
let _cache: CachedSnapshot | null = null;

export class AlertStore {
  async getSnapshot(forceRefresh = false): Promise<RealAlertQueryResult> {
    const now = Date.now();
    if (!forceRefresh && _cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
      return _cache.snapshot;
    }

    // 1. Fetch IMD CAP alerts
    const imdResult = await imdCapClient.fetchCapFeed();

    // 2. Probe SACHET portal status
    const sachetResult = await sachetClient.probeFeed();

    const feedStatuses: FeedStatusRecord[] = [
      {
        feedId: 'imd-nwfc',
        name: 'IMD National Weather Forecasting Centre',
        authority: 'India Meteorological Department (MoES, Govt. of India)',
        url: IMD_RSS_ENDPOINT,
        status: imdResult.success ? 'CONNECTED' : 'UNAVAILABLE',
        itemCount: imdResult.alerts.length,
        lastChecked: new Date().toISOString(),
        responseTimeMs: imdResult.responseTimeMs,
        notes: imdResult.success
          ? `Connected to official WMO CAP-Alert registry. Retrieved ${imdResult.alerts.length} verified alerts.`
          : `Connection error: ${imdResult.error || 'Failed to connect'}`,
        isAuthoritative: true,
      },
      sachetResult.feedStatus,
    ];

    const alerts = imdResult.alerts;
    const activeCount = alerts.filter((a) => a.isActive).length;
    const staleCount = alerts.filter((a) => !a.isActive).length;

    const snapshot: RealAlertQueryResult = {
      alerts,
      feedStatuses,
      lastRefreshed: new Date().toISOString(),
      activeCount,
      staleCount,
    };

    _cache = { snapshot, fetchedAt: now };
    return snapshot;
  }

  /**
   * Returns alerts adhering to the standard DemoAlert / RealAlert format.
   * If includeStale is true, includes expired recent advisories (tagged with freshnessStatus: 'STALE').
   * In REAL mode, when no active event is ongoing, active alerts list is empty (clean all-clear).
   */
  async getAlerts(includeStale = true): Promise<DemoAlert[]> {
    const snapshot = await this.getSnapshot();
    if (includeStale) {
      return snapshot.alerts;
    }
    return snapshot.alerts.filter((a) => a.isActive);
  }

  async getActiveAlerts(): Promise<DemoAlert[]> {
    const snapshot = await this.getSnapshot();
    return snapshot.alerts.filter((a) => a.isActive);
  }

  _resetForTesting(): void {
    _cache = null;
  }
}

export const alertStore = new AlertStore();
