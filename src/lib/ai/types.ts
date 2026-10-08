/**
 * AI Disaster Intelligence Assistant — Types
 *
 * Grounded decision-support intelligence:
 * User Question → Intent Detection → Relevant Disaster Data → Structured Analysis → AI Explanation → Sources
 */

import type { Role } from '@/types/roles';
import type { LiveDataOverrides } from '@/lib/realtime/types';

export type AssistantIntent =
  | 'SITUATION_SUMMARY'
  | 'RISK_ANALYSIS'
  | 'FLOOD_ANALYSIS'
  | 'CYCLONE_ANALYSIS'
  | 'ALERT_QUERY'
  | 'ROAD_QUERY'
  | 'ROUTE_QUERY'
  | 'DESTINATION_QUERY'
  | 'SHELTER_QUERY'
  | 'RESOURCE_QUERY'
  | 'FIELD_REPORT_QUERY'
  | 'HISTORICAL_QUERY'
  | 'IMPACT_QUERY'
  | 'RESPONSE_QUERY'
  | 'LIVE_CHANGE_QUERY'
  | 'GENERAL_OPERATIONAL';

export type DataQualityBadge =
  | 'VERIFIED'
  | 'PREDICTED'
  | 'SIMULATED'
  | 'CITIZEN_REPORT'
  | 'HISTORICAL'
  | 'LIVE_UPDATED';

export interface StructuredSections {
  situation: string;
  keyFactors: string[];
  currentData: Record<string, string | number>;
  operationalContext: string;
  dataFreshness: string;
}

export interface AssistantResponsePayload {
  text: string;
  intent: AssistantIntent;
  sources: string[];
  dataQuality: DataQualityBadge[];
  structuredSections: StructuredSections;
  providerUsed: string;
  locationFocus?: string;
  timestamp: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  intent?: AssistantIntent;
  sources?: string[];
  dataQuality?: DataQualityBadge[];
  structuredSections?: StructuredSections;
  providerUsed?: string;
  locationFocus?: string;
  isBriefing?: boolean;
}

export interface StructuredContextPayload {
  intent: AssistantIntent;
  targetLocation?: string;
  dataFreshness: {
    lastSyncFormatted: string;
    secondsSinceSync: number;
    isSimulated: boolean;
  };
  summary: {
    activeDisasters: string[];
    highestRiskLocation: string;
    statusLevel: string;
    narrative: string;
  };
  kpis: {
    riskScore: number;
    highRiskLocationsCount: number;
    exposedPopulation: number;
    buildingsAffected: number;
    activeAlertsCount: number;
    blockedRoadsCount: number;
    sheltersUnderPressure: number;
    resourceDeficitsCount: number;
    citizenReportsCount: number;
  };
  relevantAlerts?: {
    id: string;
    title: string;
    severity: string;
    regionName: string;
    message: string;
  }[];
  relevantRisks?: {
    id: string;
    name: string;
    district: string;
    severity: string;
    score: number;
    dominantHazard: string;
    exposedPopulation: number;
  }[];
  relevantRoads?: {
    id: string;
    name: string;
    status: string;
    severity: string;
    reason: string;
  }[];
  relevantShelters?: {
    id: string;
    name: string;
    location: string;
    capacity: number;
    occupancy: number;
    projectedDemand: number;
    gap: number;
    status: string;
  }[];
  relevantResources?: {
    category: string;
    available: number;
    required: number;
    deficit: number;
    status: string;
  }[];
  recentReports?: {
    id: string;
    title: string;
    severity: string;
    status: string;
    address: string;
  }[];
  recentLiveEvents?: {
    id: string;
    type: string;
    title: string;
    severity: string;
    timeFormatted: string;
    summary: string;
  }[];
}

export interface AssistantQueryRequest {
  question: string;
  locationFocus?: string;
  role?: Role;
  liveOverrides?: Partial<LiveDataOverrides>;
  secondsSinceSync?: number;
}
