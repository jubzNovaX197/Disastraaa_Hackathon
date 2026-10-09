/**
 * India Meteorological Department (IMD) CAP Alert Client
 *
 * Consumes authoritative Common Alerting Protocol (CAP v1.2) feeds issued by
 * IMD's National Weather Forecasting Centre (NWFC, New Delhi), mirrored on the
 * official WMO CAP Alert Hub public registry.
 *
 * Source: https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml
 * OID Prefix: urn:oid:2.49.0.1.356.0... (Republic of India)
 */

import type { LngLat } from '@/data/types';
import type { FreshnessStatus } from '@/lib/ingestion/types';
import type { HazardType, Severity } from '@/types';
import type { RealAlert } from './types';

export const IMD_RSS_ENDPOINT = 'https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml';

// Known coordinates for Indian states / meteorological subdivisions
const REGION_CENTROIDS: Record<string, LngLat> = {
  odisha: [85.8245, 20.2961],
  uttarakhand: [79.0193, 30.0668],
  'andhra pradesh': [83.2185, 17.6868],
  'coastal andhra pradesh': [83.2185, 17.6868],
  chhattisgarh: [81.6296, 21.2514],
  'west bengal': [88.3639, 22.5726],
  gujarat: [72.5714, 23.0225],
  maharashtra: [72.8777, 19.076],
  kerala: [76.2711, 10.8505],
  'tamil nadu': [80.2707, 13.0827],
  assam: [92.9376, 26.2006],
  delhi: [77.1025, 28.7041],
  bihar: [85.1376, 25.5941],
  rajasthan: [75.7873, 26.9124],
};

function resolveRegionCentroid(areaDesc: string): LngLat {
  const lower = areaDesc.toLowerCase();
  for (const [key, coords] of Object.entries(REGION_CENTROIDS)) {
    if (lower.includes(key)) {
      return coords;
    }
  }
  // Default to central India (Bhubaneswar/Odisha operational hub)
  return [85.8245, 20.2961];
}

function parseXmlTag(xml: string, tagName: string): string | null {
  // Matches <tagName>content</tagName> or <cap:tagName>content</cap:tagName>
  const escaped = tagName.replace(':', '\\:');
  const regex = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${escaped}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${escaped}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function parseXmlTags(xml: string, tagName: string): string[] {
  const escaped = tagName.replace(':', '\\:');
  const regex = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${escaped}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${escaped}>`, 'gi');
  const matches = [...xml.matchAll(regex)];
  return matches.map((m) => m[1].trim());
}

function parsePolygonCoordinates(polygonStr: string): { coordinates: LngLat; polygon: [number, number][] } | null {
  try {
    const pairs = polygonStr.trim().split(/\s+/);
    if (pairs.length < 3) return null;

    const ring: [number, number][] = [];
    let sumLon = 0;
    let sumLat = 0;

    for (const pair of pairs) {
      const [latStr, lonStr] = pair.split(',');
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (!isNaN(lat) && !isNaN(lon)) {
        ring.push([lon, lat]);
        sumLon += lon;
        sumLat += lat;
      }
    }

    if (ring.length === 0) return null;

    const center: LngLat = [
      Math.round((sumLon / ring.length) * 10000) / 10000,
      Math.round((sumLat / ring.length) * 10000) / 10000,
    ];

    return { coordinates: center, polygon: ring };
  } catch {
    return null;
  }
}

function mapCapSeverity(severityStr: string | null): Severity {
  const s = (severityStr || '').toLowerCase();
  if (s.includes('extreme')) return 'CRITICAL';
  if (s.includes('severe')) return 'HIGH';
  if (s.includes('moderate')) return 'MODERATE';
  return 'LOW';
}

function mapCapHazardType(eventStr: string | null, headline: string | null): HazardType {
  const text = `${eventStr || ''} ${headline || ''}`.toLowerCase();
  if (text.includes('cyclon') || text.includes('storm') || text.includes('squall') || text.includes('wind')) {
    return 'CYCLONE';
  }
  if (text.includes('flood') || text.includes('rain') || text.includes('inundation')) {
    return 'FLOOD';
  }
  if (text.includes('heat') || text.includes('temperature')) {
    return 'HEATWAVE';
  }
  if (text.includes('lightning') || text.includes('thunder')) {
    return 'LIGHTNING';
  }
  if (text.includes('landslide')) {
    return 'LANDSLIDE';
  }
  return 'FLOOD';
}

// In-memory cache for individual CAP documents to avoid repeated network hits
const capDocCache = new Map<string, { doc: string; cachedAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins

export class ImdCapClient {
  async fetchCapFeed(timeoutMs = 8000): Promise<{
    success: boolean;
    alerts: RealAlert[];
    responseTimeMs: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await fetch(IMD_RSS_ENDPOINT, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
          'User-Agent': 'Disastraaa-Emergency-Monitor/1.0 (Public Safety Integration)',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      const responseTimeMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          alerts: [],
          responseTimeMs,
          error: `HTTP ${response.status} ${response.statusText}`,
        };
      }

      const rssXml = await response.text();
      const items = parseXmlTags(rssXml, 'item');

      const alerts: RealAlert[] = [];

      for (const itemXml of items) {
        const title = parseXmlTag(itemXml, 'title') || 'Weather Advisory';
        const link = parseXmlTag(itemXml, 'link');
        const description = parseXmlTag(itemXml, 'description') || '';
        const guid = parseXmlTag(itemXml, 'guid') || `imd-${Date.now()}`;
        const pubDateStr = parseXmlTag(itemXml, 'pubDate');
        const author = parseXmlTag(itemXml, 'author') || 'NWFC DIVISION, IMD, NEW DELHI';

        let capXml: string | null = null;

        if (link && link.endsWith('.xml')) {
          // Check cache
          const cached = capDocCache.get(link);
          if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
            capXml = cached.doc;
          } else {
            try {
              const capRes = await fetch(link, {
                headers: { Accept: 'application/xml, text/xml' },
                signal: AbortSignal.timeout(6000),
              });
              if (capRes.ok) {
                capXml = await capRes.text();
                capDocCache.set(link, { doc: capXml, cachedAt: Date.now() });
              }
            } catch {
              // Fallback to RSS item metadata if child XML fails
            }
          }
        }

        const alert = this.normalizeAlertItem({
          title,
          link: link || IMD_RSS_ENDPOINT,
          description,
          guid,
          pubDateStr,
          author,
          capXml,
        });

        if (alert) {
          alerts.push(alert);
        }
      }

      return {
        success: true,
        alerts,
        responseTimeMs,
      };
    } catch (err) {
      return {
        success: false,
        alerts: [],
        responseTimeMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'Unknown network failure',
      };
    }
  }

  private normalizeAlertItem(params: {
    title: string;
    link: string;
    description: string;
    guid: string;
    pubDateStr: string | null;
    author: string;
    capXml: string | null;
  }): RealAlert | null {
    const { title, link, description, guid, pubDateStr, author, capXml } = params;

    let event = 'Severe Weather';
    let severityStr = 'Severe';
    let urgency = 'Expected';
    let certainty = 'Likely';
    let headline = title;
    let message = description;
    let instruction = '';
    let areaDesc = 'Regional Meteorological Sector';
    let polygonString: string | null = null;
    let sentTime = pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString();
    let expiresTime: string | undefined;
    let senderName = author;
    let webUrl = link;

    if (capXml) {
      event = parseXmlTag(capXml, 'event') || event;
      severityStr = parseXmlTag(capXml, 'severity') || severityStr;
      urgency = parseXmlTag(capXml, 'urgency') || urgency;
      certainty = parseXmlTag(capXml, 'certainty') || certainty;
      headline = parseXmlTag(capXml, 'headline') || headline;
      message = parseXmlTag(capXml, 'description') || message;
      instruction = parseXmlTag(capXml, 'instruction') || '';
      areaDesc = parseXmlTag(capXml, 'areaDesc') || areaDesc;
      polygonString = parseXmlTag(capXml, 'polygon');
      sentTime = parseXmlTag(capXml, 'sent') || sentTime;
      expiresTime = parseXmlTag(capXml, 'expires') || undefined;
      senderName = parseXmlTag(capXml, 'senderName') || senderName;
      webUrl = parseXmlTag(capXml, 'web') || webUrl;
    }

    // Coordinates extraction
    let coordinates: LngLat = resolveRegionCentroid(areaDesc);
    let polygon: [number, number][] | undefined;

    if (polygonString) {
      const parsedPoly = parsePolygonCoordinates(polygonString);
      if (parsedPoly) {
        coordinates = parsedPoly.coordinates;
        polygon = parsedPoly.polygon;
      }
    }

    const severity = mapCapSeverity(severityStr);
    const hazardType = mapCapHazardType(event, headline);

    // Freshness evaluation
    const now = Date.now();
    let freshnessStatus: FreshnessStatus = 'LIVE';
    let isActive = true;

    if (expiresTime) {
      const expDate = new Date(expiresTime).getTime();
      if (!isNaN(expDate) && expDate < now) {
        freshnessStatus = 'STALE';
        isActive = false;
      }
    } else {
      // If no explicit expires tag, check sent date (> 48h = STALE)
      const sentDate = new Date(sentTime).getTime();
      if (!isNaN(sentDate) && now - sentDate > 48 * 3600 * 1000) {
        freshnessStatus = 'STALE';
        isActive = false;
      }
    }

    const cleanId = `alert-imd-${guid.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    return {
      id: cleanId,
      type: hazardType,
      severity,
      title: headline,
      message,
      coordinates,
      regionName: areaDesc,
      issuedAt: sentTime,
      expiresAt: expiresTime,
      isActive,
      sourceAgency: 'India Meteorological Department (IMD)',
      sourceFeed: 'WMO CAP Alert Hub / IMD NWFC Division',
      instruction: instruction || undefined,
      areaDesc,
      urgency: urgency as RealAlert['urgency'],
      certainty: certainty as RealAlert['certainty'],
      category: 'Meteorological Early Warning',
      polygon,
      freshnessStatus,
      capIdentifier: guid,
      senderName,
      webUrl,
    };
  }
}

export const imdCapClient = new ImdCapClient();
