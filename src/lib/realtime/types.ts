/**
 * Live Disaster Intelligence & Real-Time Operations — Types
 *
 * Provides a unified real-time event streaming and intelligence state model
 * for continuous operational situational awareness without full page reloads.
 */

import type { Severity, HazardType } from '@/types';
import type { DemoAlert as Alert, Shelter } from '@/data/types';
import type { CitizenReportItem } from '@/lib/reports/types';
import type { RoadSegment, RoadStatus } from '@/lib/roads/types';
import type { CommandCenterData } from '@/lib/commandCenter/types';
import type { ResponseCoordinationData } from '@/lib/response/types';
import type { SituationAnalyticsData } from '@/lib/analytics/types';

export type LiveEventType =
  | 'ALERT_CREATED'
  | 'ALERT_UPDATED'
  | 'ALERT_EXPIRED'
  | 'REPORT_RECEIVED'
  | 'REPORT_VERIFIED'
  | 'ROAD_STATUS_CHANGED'
  | 'SHELTER_OCCUPANCY_CHANGED'
  | 'RESOURCE_STOCKPILE_CHANGED'
  | 'HYDRO_MET_SURGE';

export type LiveConnectionStatus =
  | 'connected'
  | 'updating'
  | 'paused'
  | 'reconnecting'
  | 'delayed'
  | 'offline';

export interface LiveEvent {
  id: string;
  type: LiveEventType;
  timestamp: string; // ISO string
  timeFormatted: string; // e.g. "14:32"
  locationName: string;
  district?: string;
  title: string;
  summary: string;
  severity: Severity;
  category: 'ALERT' | 'REPORT' | 'ROAD' | 'SHELTER' | 'RESOURCE' | 'SENSOR';
  metadata?: Record<string, unknown>;
}

export interface LiveDataOverrides {
  alerts: Alert[];
  reports: CitizenReportItem[];
  roads: RoadSegment[];
  shelters: Shelter[];
  shelterOccupancies: Record<string, number>;
  resourceStocks: Record<string, number>;
  riverGaugeDeltas: Record<string, number>; // zoneId -> meters
  rainfallDeltas: Record<string, number>; // zoneId -> mm
  environment?: import('@/lib/env').AppEnvironment;
}

export interface LiveIntelligenceState {
  status: LiveConnectionStatus;
  sourceName: string;
  lastSyncTime: Date;
  secondsSinceSync: number;
  updateIntervalSeconds: number;
  isPaused: boolean;
  isDrawerOpen: boolean;
  recentEvents: LiveEvent[];
  unreadEventCount: number;
  overrides: LiveDataOverrides;
  commandCenterData: CommandCenterData;
  responseCoordinationData: ResponseCoordinationData;
  situationAnalyticsData: SituationAnalyticsData;
  environment: import('@/lib/env').AppEnvironment;
}

export interface LiveIntelligenceContextType extends LiveIntelligenceState {
  pauseFeed: () => void;
  resumeFeed: () => void;
  refreshNow: () => void;
  triggerNextEvent: () => void;
  resetToBaseline: () => void;
  setUpdateInterval: (seconds: number) => void;
  simulateConnectionDrop: () => void;
  markEventsRead: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setIsDrawerOpen: (open: boolean) => void;
  switchEnvironment: (env: import('@/lib/env').AppEnvironment) => void;
  submitCitizenReport: (input: import('@/lib/reports').CreateReportInput) => Promise<{
    report: CitizenReportItem;
    incident: import('@/lib/incidents').Incident;
  }>;
}
