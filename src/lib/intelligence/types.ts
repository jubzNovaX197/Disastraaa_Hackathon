/**
 * Disaster Intelligence & Decision Support — Core Types (Stage 5B)
 *
 * Defines strictly typed structures for:
 * 1. DisasterIntelligenceSnapshot — Grounded operational state for a district.
 * 2. DisasterIntelligenceSummary — AI or rule-based executive summary & decision support.
 */

import type { FloodRiskResult } from '@/lib/risk/flood/types';
import type { CycloneRiskResult } from '@/lib/risk/cyclone/types';
import type { MultiHazardRiskResult } from '@/lib/risk/multiHazard/types';
import type { InputQualityStatus } from '@/lib/risk/inputQuality';
import type { WeatherForecastPoint } from '@/lib/weather/types';
import type { AppEnvironment } from '@/lib/env';

export type RecommendationPriority = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export type RecommendationCategory =
  | 'IMMEDIATE_LIFE_SAFETY'
  | 'OPERATIONAL_PREPAREDNESS'
  | 'RESOURCE_STAGING'
  | 'GROUND_VERIFICATION'
  | 'PUBLIC_ADVISORY';

export interface DecisionSupportRecommendation {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  action: string;
  rationale: string;
  targetAuthorityOrAudience: string;
  triggerBasis: string;
}

export interface SnapshotLocation {
  id: string;
  name: string;
  district: string;
  state: string;
  coordinates: [number, number]; // [lon, lat]
  population: number;
  populationSource: string;
}

export interface SnapshotWeatherTelemetry {
  status: InputQualityStatus;
  source: string;
  observedAt?: string;
  retrievedAt: string;
  temperatureC?: number;
  relativeHumidityPct?: number;
  precipitationMm?: number;
  windSpeedKmh?: number;
  surfacePressureHpa?: number;
  weatherCondition?: string;
  notes: string[];
}

export interface SnapshotWeatherForecast {
  status: 'MODELLED_FORECAST' | 'UNAVAILABLE';
  source: string;
  retrievedAt: string;
  hourlyPoints: WeatherForecastPoint[];
  summaryNote: string;
}

export interface SnapshotRiverGauge {
  stationCode: string;
  stationName: string;
  riverName: string;
  basin: string;
  district: string;
  waterLevelMetres: number;
  dangerLevelMetres?: number;
  floodStageMetres?: number;
  unit: 'metres';
  observedAt?: string;
  status: InputQualityStatus;
  source: string;
}

export interface SnapshotModelledDischarge {
  status: 'MODELLED_FORECAST' | 'UNAVAILABLE';
  dischargeM3s?: number;
  unit: 'm³/s';
  model: string;
  generatedAt?: string;
  notes?: string;
}

export interface SnapshotHydrology {
  status: 'CONNECTED' | 'STANDBY' | 'UNAVAILABLE';
  riverGauges: SnapshotRiverGauge[];
  modelledDischarge?: SnapshotModelledDischarge;
  notes: string[];
}

export interface SnapshotAlert {
  id: string;
  title: string;
  severity: string;
  urgency?: string;
  certainty?: string;
  headline?: string;
  description?: string;
  instruction?: string;
  areaDesc?: string;
  issuedAt?: string;
  expiresAt?: string;
  source: string;
  status: 'FRESH_VERIFIED' | 'STALE';
}

export interface SnapshotRoadDisruption {
  id: string;
  name: string;
  status: string;
  blockageType: string;
  severity: string;
  travelRiskScore: number;
  recommendation: string;
  verifiedBy: string;
  lastUpdated: string;
}

export interface SnapshotRoads {
  monitoredCount: number;
  blockedCount: number;
  closedCount: number;
  disruptedSegments: SnapshotRoadDisruption[];
  passabilityNote: string;
}

export interface SnapshotShelter {
  id: string;
  name: string;
  capacity: number;
  occupancy: number | null;
  occupancyStatus: 'MEASURED' | 'UNMONITORED';
  address?: string;
  hasMedical?: boolean;
  hasFood?: boolean;
  hasPower?: boolean;
}

export interface SnapshotShelters {
  registeredSheltersCount: number;
  totalRegisteredCapacity: number;
  shelters: SnapshotShelter[];
  occupancyStatusNote: string;
}

export interface SnapshotCitizenReport {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  address?: string;
  createdAt: string;
  isVerified: boolean;
}

export interface SnapshotCitizenIntelligence {
  totalReports: number;
  verifiedReports: number;
  pendingReports: number;
  recentReports: SnapshotCitizenReport[];
  cautionaryNote: string;
}

export interface SnapshotImpactEstimation {
  potentiallyAffectedPopulation: number;
  methodologyNote: string;
  dataQualityLimitations: string;
}

export interface SnapshotLimitations {
  overallQuality: 'HIGH' | 'DEGRADED' | 'INSUFFICIENT';
  confidenceScore: number;
  missingCriticalInputs: string[];
  staleFeeds: string[];
  unmonitoredSensors: string[];
  providerErrors: string[];
  unresolvedUncertainties: string[];
}

export interface DisasterIntelligenceSnapshot {
  snapshotId: string;
  generatedAt: string;
  environment: AppEnvironment;
  location: SnapshotLocation;
  risks: {
    flood: FloodRiskResult;
    cyclone: CycloneRiskResult;
    multiHazard: MultiHazardRiskResult;
    compositeScore: number;
    dominantHazard: string;
    overallSeverity: string;
    inputQualityStatus: 'HIGH' | 'DEGRADED' | 'INSUFFICIENT';
    confidence: number;
  };
  weather: {
    current: SnapshotWeatherTelemetry;
    forecast: SnapshotWeatherForecast;
  };
  hydrology: SnapshotHydrology;
  alerts: {
    totalActive: number;
    records: SnapshotAlert[];
    statusNote: string;
  };
  roads: SnapshotRoads;
  shelters: SnapshotShelters;
  citizenIntelligence: SnapshotCitizenIntelligence;
  impact: SnapshotImpactEstimation;
  limitations: SnapshotLimitations;
  deterministicRecommendations: DecisionSupportRecommendation[];
}

export interface DisasterIntelligenceSummary {
  summaryId: string;
  snapshotId: string;
  generatedAt: string;
  generationMode: 'AI' | 'RULE_BASED';
  provider: string;
  location: SnapshotLocation;
  executiveSummary: string;
  currentRiskAssessment: {
    overview: string;
    compositeScore: number;
    dominantThreat: string;
    severityLevel: string;
    confidenceLevel: string;
  };
  supportingEvidence: string[];
  keyUncertainties: string[];
  recommendedActions: DecisionSupportRecommendation[];
  sourceReferences: string[];
  dataQualityBadge: 'HIGH' | 'DEGRADED' | 'INSUFFICIENT';
  provenanceDisclaimer: string;
}
