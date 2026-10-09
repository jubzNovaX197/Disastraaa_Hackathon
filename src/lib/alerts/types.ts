/**
 * Authoritative Emergency Alert Domain Types
 *
 * Implements data structures for real public alert feeds:
 * - India Meteorological Department (IMD / NWFC) via WMO Alert Hub
 * - National Disaster Management Authority (NDMA / SACHET)
 * - Global Disaster Alert and Coordination System (GDACS)
 */

import type { DemoAlert } from '@/data/types';
import type { FreshnessStatus } from '@/lib/ingestion/types';

export type AlertFeedStatus = 'CONNECTED' | 'RESTRICTED_WAF' | 'UNAVAILABLE' | 'STANDBY';

export interface FeedStatusRecord {
  feedId: string;
  name: string;
  authority: string;
  url: string;
  status: AlertFeedStatus;
  itemCount: number;
  lastChecked: string;
  responseTimeMs?: number;
  notes: string;
  isAuthoritative: boolean;
}

export interface RealAlert extends DemoAlert {
  sourceAgency: string;
  sourceFeed: string;
  instruction?: string;
  areaDesc: string;
  urgency?: 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown';
  certainty?: 'Observed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown';
  category?: string;
  polygon?: [number, number][]; // [lon, lat][]
  freshnessStatus: FreshnessStatus;
  capIdentifier?: string;
  senderName?: string;
  webUrl?: string;
}

export interface RealAlertQueryResult {
  alerts: RealAlert[];
  feedStatuses: FeedStatusRecord[];
  lastRefreshed: string;
  activeCount: number;
  staleCount: number;
}
