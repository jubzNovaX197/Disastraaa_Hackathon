/**
 * NASA Earth Observatory Natural Event Tracker (EONET) v3 Client
 *
 * NASA EONET API provides curated, authoritative real-time hazard data:
 * - Severe Storms (Tropical Cyclones, Typhoons, Gales)
 * - Floods & Inundations
 * - Wildfires
 * - Landslides
 * - Earthquakes
 *
 * Endpoint: https://eonet.gsfc.nasa.gov/api/v3/events
 * No API key required (Public NASA open data).
 */

import { objectStorage } from '@/lib/storage';
import { INDIA_BBOX, type BoundingBox } from '../types';

export interface EonetCategory {
  id: string;
  title: string;
}

export interface EonetSource {
  id: string;
  url: string;
}

export interface EonetGeometry {
  magnitudeValue?: number | null;
  magnitudeUnit?: string | null;
  date: string; // ISO
  type: 'Point' | 'Polygon';
  coordinates: number[] | number[][]; // [lon, lat] or [[lon, lat], ...]
}

export interface EonetEventRaw {
  id: string; // e.g. "EONET_25063"
  title: string;
  description?: string | null;
  link?: string;
  closed?: string | null;
  categories: EonetCategory[];
  sources: EonetSource[];
  geometry: EonetGeometry[];
}

export interface EonetResponseRaw {
  title: string;
  description: string;
  link: string;
  events: EonetEventRaw[];
}

export interface FetchEonetOptions {
  bbox?: BoundingBox;
  daysBack?: number;
  status?: 'open' | 'all';
  limit?: number;
  timeoutMs?: number;
  archiveSnapshot?: boolean;
}

export interface EonetFetchResult {
  success: boolean;
  events: EonetEventRaw[];
  archiveStorageKey?: string;
  error?: string;
  durationMs: number;
}

export class EonetClient {
  private static readonly BASE_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events';

  async fetchEvents(options: FetchEonetOptions = {}): Promise<EonetFetchResult> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs ?? 8000;
    const bbox = options.bbox ?? INDIA_BBOX;
    const daysBack = options.daysBack ?? 45;
    const status = options.status ?? 'all';
    const limit = options.limit ?? 60;

    const bboxStr = `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
    const url = `${EonetClient.BASE_URL}?bbox=${bboxStr}&days=${daysBack}&status=${status}&limit=${limit}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Disastraaa-Disaster-Intelligence/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          events: [],
          error: `NASA EONET API returned HTTP ${response.status}: ${response.statusText}`,
          durationMs: Date.now() - startTime,
        };
      }

      const data: EonetResponseRaw = await response.json();
      const events = Array.isArray(data.events) ? data.events : [];

      let archiveStorageKey: string | undefined;
      if (options.archiveSnapshot !== false && events.length > 0) {
        try {
          const snapshotKey = `raw/eonet/${new Date().toISOString().slice(0, 10)}/eonet-${Date.now()}.json`;
          const meta = await objectStorage.putObject({
            key: snapshotKey,
            data: JSON.stringify(data),
            contentType: 'application/json',
          });
          archiveStorageKey = meta.key;
        } catch {
          // Object storage is non-blocking
        }
      }

      return {
        success: true,
        events,
        archiveStorageKey,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError';
      const msg = isTimeout
        ? `NASA EONET API request timed out after ${timeoutMs}ms.`
        : err?.message || 'Unknown network error fetching NASA EONET events.';

      console.warn('[EONET-CLIENT]', msg);

      return {
        success: false,
        events: [],
        error: msg,
        durationMs: Date.now() - startTime,
      };
    }
  }
}

export const eonetClient = new EonetClient();
