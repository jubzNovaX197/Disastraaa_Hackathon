/**
 * NDMA SACHET Alert Feed Probe & Status Evaluator
 *
 * Investigates and probes the official National Disaster Alert Portal (SACHET / NDMA).
 *
 * Target: https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml
 * Technical Limitation:
 * The official SACHET RSS endpoint is protected by C-DOT bot defense / Cloudflare WAF,
 * returning HTTP 403 Forbidden to direct server-to-server programmatic HTTP requests.
 *
 * In accordance with engineering guidelines:
 * - We NEVER fabricate alerts or fake SACHET responses.
 * - We cleanly document the restriction in feed status and provenance.
 * - When inaccessible, we return an explicit RESTRICTED status and 0 alerts.
 */

import type { FeedStatusRecord } from './types';

export const SACHET_FEED_URL = 'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml';

export class SachetClient {
  async probeFeed(timeoutMs = 6000): Promise<{
    feedStatus: FeedStatusRecord;
    isAccessible: boolean;
  }> {
    const startTime = Date.now();

    try {
      const response = await fetch(SACHET_FEED_URL, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Disastraaa/1.0',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      const responseTimeMs = Date.now() - startTime;

      if (response.status === 403) {
        return {
          isAccessible: false,
          feedStatus: {
            feedId: 'ndma-sachet',
            name: 'NDMA SACHET National Alert Portal',
            authority: 'National Disaster Management Authority (C-DOT)',
            url: SACHET_FEED_URL,
            status: 'RESTRICTED_WAF',
            itemCount: 0,
            lastChecked: new Date().toISOString(),
            responseTimeMs,
            notes: 'Feed protected by C-DOT WAF policy (HTTP 403 Forbidden). Requires browser session tokens or whitelisted IP.',
            isAuthoritative: true,
          },
        };
      }

      if (response.ok) {
        return {
          isAccessible: true,
          feedStatus: {
            feedId: 'ndma-sachet',
            name: 'NDMA SACHET National Alert Portal',
            authority: 'National Disaster Management Authority (C-DOT)',
            url: SACHET_FEED_URL,
            status: 'CONNECTED',
            itemCount: 0,
            lastChecked: new Date().toISOString(),
            responseTimeMs,
            notes: 'Direct connection established to SACHET portal.',
            isAuthoritative: true,
          },
        };
      }

      return {
        isAccessible: false,
        feedStatus: {
          feedId: 'ndma-sachet',
          name: 'NDMA SACHET National Alert Portal',
          authority: 'National Disaster Management Authority (C-DOT)',
          url: SACHET_FEED_URL,
          status: 'UNAVAILABLE',
          itemCount: 0,
          lastChecked: new Date().toISOString(),
          responseTimeMs,
          notes: `Server returned HTTP ${response.status} ${response.statusText}`,
          isAuthoritative: true,
        },
      };
    } catch (err) {
      return {
        isAccessible: false,
        feedStatus: {
          feedId: 'ndma-sachet',
          name: 'NDMA SACHET National Alert Portal',
          authority: 'National Disaster Management Authority (C-DOT)',
          url: SACHET_FEED_URL,
          status: 'UNAVAILABLE',
          itemCount: 0,
          lastChecked: new Date().toISOString(),
          responseTimeMs: Date.now() - startTime,
          notes: err instanceof Error ? `Connection timeout: ${err.message}` : 'Network unreachable',
          isAuthoritative: true,
        },
      };
    }
  }
}

export const sachetClient = new SachetClient();
