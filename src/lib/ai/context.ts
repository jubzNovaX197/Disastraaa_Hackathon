/**
 * AI Disaster Intelligence Assistant — Structured Context Builder
 *
 * Extracts compact, relevant structured slices from active disaster engines.
 * Avoids passing entire application state unnecessarily.
 */

import { aggregateCommandCenterData } from '@/lib/commandCenter/aggregator';
import type { LiveDataOverrides } from '@/lib/realtime/types';
import type { AssistantIntent, StructuredContextPayload } from './types';
import { DETERMINISTIC_LIVE_EVENTS } from '@/lib/realtime/events';

interface BuildContextOptions {
  intent: AssistantIntent;
  targetLocation?: string;
  liveOverrides?: LiveDataOverrides;
  secondsSinceSync?: number;
}

export function buildStructuredContext({
  intent,
  targetLocation,
  liveOverrides,
  secondsSinceSync = 12,
}: BuildContextOptions): StructuredContextPayload {
  // Aggregate unified command center intelligence with live overrides applied
  const ccData = aggregateCommandCenterData(liveOverrides);

  // Normalize location filter for case-insensitive matching
  const locFilter = targetLocation?.toLowerCase().trim();

  // Freshness metadata
  const isReal = liveOverrides?.environment === 'REAL';
  const freshness = {
    lastSyncFormatted: secondsSinceSync === 0 ? 'Just now' : `${secondsSinceSync}s ago`,
    secondsSinceSync,
    isSimulated: !isReal,
  };

  // Base summary
  const summary = {
    activeDisasters: ccData.overview.activeDisasters.map((d) => `${d.name} (${d.severity})`),
    highestRiskLocation: ccData.overview.highestRiskLocation,
    statusLevel: ccData.narrative.statusLevel,
    narrative: ccData.narrative.situation,
  };

  // Base KPIs
  const kpis = {
    riskScore: ccData.kpis.risk.highestCurrentRisk.score,
    highRiskLocationsCount: ccData.kpis.risk.highRiskLocationsCount,
    exposedPopulation: ccData.kpis.impact.populationExposed,
    buildingsAffected: ccData.kpis.impact.estimatedBuildingsAffected,
    activeAlertsCount: ccData.kpis.response.activeAlertsCount,
    blockedRoadsCount: ccData.roadOperations.blockedCount + ccData.roadOperations.closedCount,
    sheltersUnderPressure: ccData.shelterOperations.highUtilizationShelters,
    resourceDeficitsCount: ccData.resourceOperations.totalDeficitCategories,
    citizenReportsCount: ccData.citizenIntelligence.totalReports,
  };

  const payload: StructuredContextPayload = {
    intent,
    targetLocation: targetLocation || undefined,
    dataFreshness: freshness,
    summary,
    kpis,
  };

  // 1. Alert queries or situation summary
  if (intent === 'ALERT_QUERY' || intent === 'SITUATION_SUMMARY' || intent === 'GENERAL_OPERATIONAL') {
    let alerts = ccData.activeAlerts;
    if (locFilter) {
      alerts = alerts.filter(
        (a) =>
          a.regionName.toLowerCase().includes(locFilter) ||
          a.title.toLowerCase().includes(locFilter),
      );
    }
    payload.relevantAlerts = alerts.slice(0, 5).map((a) => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      regionName: a.regionName,
      message: a.message,
    }));
  }

  // 2. Risk, Flood, Cyclone, or Situation queries
  if (
    intent === 'RISK_ANALYSIS' ||
    intent === 'FLOOD_ANALYSIS' ||
    intent === 'CYCLONE_ANALYSIS' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'IMPACT_QUERY' ||
    intent === 'RESPONSE_QUERY' ||
    intent === 'GENERAL_OPERATIONAL'
  ) {
    let locations = ccData.priorityLocations;
    if (locFilter) {
      locations = locations.filter(
        (l) =>
          l.name.toLowerCase().includes(locFilter) ||
          l.district.toLowerCase().includes(locFilter),
      );
    }
    if (intent === 'FLOOD_ANALYSIS') {
      locations = locations.filter((l) => (l.floodRiskScore ?? 0) > 40 || l.dominantHazard === 'FLOOD');
    } else if (intent === 'CYCLONE_ANALYSIS') {
      locations = locations.filter((l) => (l.cycloneRiskScore ?? 0) > 40 || l.dominantHazard === 'CYCLONE');
    }

    payload.relevantRisks = locations.slice(0, 6).map((l) => ({
      id: l.id,
      name: l.name,
      district: l.district,
      severity: l.severity,
      score: l.riskScore,
      dominantHazard: l.dominantHazard,
      exposedPopulation: l.populationExposed,
    }));
  }

  // 3. Road / Access queries
  if (
    intent === 'ROAD_QUERY' ||
    intent === 'ROUTE_QUERY' ||
    intent === 'DESTINATION_QUERY' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'RESPONSE_QUERY'
  ) {
    let roads = ccData.roadOperations.criticalSegments;
    if (locFilter) {
      roads = roads.filter(
        (r) =>
          r.name.toLowerCase().includes(locFilter) ||
          r.administrativeArea.toLowerCase().includes(locFilter),
      );
    }
    payload.relevantRoads = roads.slice(0, 6).map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      severity: r.severity,
      reason: r.travelRisk?.explanation || `${r.blockageType} obstruction on highway corridor`,
    }));
  }

  // 4. Shelter queries
  if (
    intent === 'SHELTER_QUERY' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'RESPONSE_QUERY'
  ) {
    let shelters = ccData.shelterOperations.items;
    if (locFilter) {
      shelters = shelters.filter(
        (s) =>
          s.location.toLowerCase().includes(locFilter) ||
          s.name.toLowerCase().includes(locFilter),
      );
    }
    payload.relevantShelters = shelters.slice(0, 6).map((s) => ({
      id: s.id,
      name: s.name,
      location: s.location,
      capacity: s.capacity,
      occupancy: s.occupancy,
      projectedDemand: s.projectedDemand,
      gap: s.gapOrSurplus,
      status: s.status,
    }));
  }

  // 5. Resource queries
  if (
    intent === 'RESOURCE_QUERY' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'RESPONSE_QUERY'
  ) {
    payload.relevantResources = ccData.resourceOperations.categories.map((c) => ({
      category: c.name,
      available: c.available,
      required: c.required,
      deficit: c.gap,
      status: c.status,
    }));
  }

  // 6. Field Report queries
  if (
    intent === 'FIELD_REPORT_QUERY' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'LIVE_CHANGE_QUERY'
  ) {
    let reports = ccData.citizenIntelligence.recentHighImpactReports;
    if (locFilter) {
      reports = reports.filter(
        (r) =>
          r.address.toLowerCase().includes(locFilter) ||
          r.administrativeArea.toLowerCase().includes(locFilter),
      );
    }
    payload.recentReports = reports.slice(0, 5).map((r) => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
      status: r.status,
      address: r.address,
    }));
  }

  // 7. Live changes queries
  if (
    intent === 'LIVE_CHANGE_QUERY' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'GENERAL_OPERATIONAL'
  ) {
    payload.recentLiveEvents = DETERMINISTIC_LIVE_EVENTS.slice(0, 4).map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      severity: e.severity,
      timeFormatted: e.timeFormatted,
      summary: e.summary,
    }));
  }

  return payload;
}
