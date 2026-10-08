/**
 * Journey Risk Engine (Task 15)
 *
 * ⚠️  PROTOTYPE DECISION SUPPORT — NOT LIVE EMERGENCY FORECAST
 *
 * Deterministic, transparent multi-factor journey risk calculation combining:
 *   Origin → Route → Destination → Time
 *
 * Weighting:
 *  - 35% Route Transit Risk (Task 13 engine output)
 *  - 25% Destination Hazard Risk (100 - Task 14 Destination Safety Score)
 *  - 20% Hazard Corridor Exposure (Flood, Cyclone, Multi-hazard proximity)
 *  - 12% Active Alert Impact (Emergency advisories intersecting corridor)
 *  -  8% Roadway Access Status (Passable vs Caution vs Blocked infrastructure)
 *  Total: 100%
 *
 * Status thresholds:
 *   0–24   → LOW
 *   25–49  → MODERATE
 *   50–74  → HIGH
 *   75–100 → VERY_HIGH
 */

import type { Severity } from '@/types';
import type { LngLat } from '@/data/types';
import { NODE_BY_ID, DEMO_NODES } from '@/lib/routing/graph';
import { calculateRoutes } from '@/lib/routing/engine';
import type { RouteComparison, RouteResult } from '@/lib/routing/types';
import { calculateDestinationSafety } from '@/lib/destination/engine';
import { DEMO_SCENARIOS, demoScenarioProvider } from '@/lib/destination/scenarios';
import type {
  DestinationSafetyResult,
  ScenarioSlotKey,
} from '@/lib/destination/types';
import type {
  HazardCorridorItem,
  JourneyAlertItem,
  JourneyEmergencyContext,
  JourneyGroundIntelligence,
  JourneyLocation,
  JourneyRiskContributions,
  JourneyRiskFactor,
  JourneyRiskRequest,
  JourneyRiskResult,
  JourneyRiskStatus,
  RoadConditionBreakdown,
  RouteJourneyComparisonItem,
  TimeJourneyComparisonItem,
} from './types';
import {
  analyzeCorridorAlerts,
  analyzeEmergencyContext,
  analyzeGroundIntelligence,
  analyzeHazardCorridor,
  analyzeRoadConditions,
  haversineDistanceKm,
} from './corridor';

// ── Threshold Helpers ───────────────────────────────────────────────────────

export function scoreToJourneyStatus(score: number): JourneyRiskStatus {
  if (score <= 24) return 'LOW';
  if (score <= 49) return 'MODERATE';
  if (score <= 74) return 'HIGH';
  return 'VERY_HIGH';
}

function clampScore(val: number): number {
  return Math.max(0, Math.min(100, Math.round(val)));
}

// ── Resolve Node / Location ─────────────────────────────────────────────────

function resolveLocation(
  nodeId?: string,
  explicitLocation?: JourneyLocation,
  fallbackCoords: LngLat = [85.8245, 20.2961]
): JourneyLocation {
  if (explicitLocation) return explicitLocation;
  if (nodeId && NODE_BY_ID[nodeId]) {
    const node = NODE_BY_ID[nodeId];
    return {
      id: node.id,
      name: node.name,
      coordinates: node.coordinates,
    };
  }
  return {
    id: nodeId || 'unknown-loc',
    name: nodeId || 'Custom Location',
    coordinates: fallbackCoords,
  };
}

// ── Main Journey Risk Engine ────────────────────────────────────────────────

export function calculateJourneyRisk(req: JourneyRiskRequest): JourneyRiskResult {
  const originNodeId = req.originNodeId || req.origin?.id || 'node-bbsr-junction';
  const destNodeId = req.destinationNodeId || req.destination?.id || 'node-puri-station';

  const origin = resolveLocation(originNodeId, req.origin, [85.8245, 20.2961]);
  const destination = resolveLocation(destNodeId, req.destination, [85.8315, 19.8134]);

  const selectedDate = req.selectedDate || new Date().toISOString().slice(0, 10);
  const selectedTime = req.selectedTime || '14:00';
  const scenarioSlot = (req.scenarioSlot as ScenarioSlotKey) || 'NOW';

  // 1. Destination Safety (Task 14)
  const destSafety: DestinationSafetyResult =
    req.destinationSafety ??
    calculateDestinationSafety({
      destinationId: destination.id,
      destinationName: destination.name,
      coordinates: destination.coordinates,
      scenarioSlot,
      selectedDate,
      selectedTime,
    });

  const destSafetyScore = destSafety.safetyScore; // 0–100, HIGHER = SAFER
  const destRiskRaw = clampScore(100 - destSafetyScore); // 0–100, HIGHER = RISKIER

  // 2. Route Engine (Task 13)
  let routeComparisonResults: RouteComparison | null = null;
  let activeRoute: RouteResult | null = req.selectedRoute ?? null;

  try {
    routeComparisonResults = calculateRoutes({
      originNodeId: origin.id,
      destinationNodeId: destination.id,
    });
    if (!activeRoute) {
      activeRoute = routeComparisonResults.safest;
    }
  } catch {
    // If routing calculation fails or nodes missing
  }

  const hasValidRoute = !!(activeRoute && activeRoute.found && activeRoute.segments.length > 0);

  // 3. Corridor Geospatial Analysis
  const corridorCoords = hasValidRoute ? activeRoute!.mapCoordinates : [origin.coordinates, destination.coordinates];
  const hazardCorridor = analyzeHazardCorridor(activeRoute, destination.coordinates);
  const roadBreakdown = analyzeRoadConditions(activeRoute);
  const corridorAlerts = analyzeCorridorAlerts(corridorCoords, destSafety.scenario.activeAlertIds);
  const groundIntelligence = analyzeGroundIntelligence(corridorCoords);
  const emergencyContext = analyzeEmergencyContext(destination.coordinates, corridorCoords);

  // 4. Calculate Individual Component Raw Scores (0–100, Higher = Riskier)

  // A. Route Risk (Raw 0–100)
  const routeRiskRaw = hasValidRoute ? activeRoute!.riskScore : destRiskRaw;

  // B. Destination Risk (Raw 0–100)
  // Already computed as destRiskRaw

  // C. Hazard Corridor Exposure Score (Raw 0–100)
  let hazardScoreRaw = 0;
  if (hazardCorridor.length > 0) {
    let severeCount = 0;
    let highCount = 0;
    let totalExposureKm = 0;
    for (const h of hazardCorridor) {
      if (h.risk === 'CRITICAL') severeCount++;
      else if (h.risk === 'HIGH') highCount++;
      totalExposureKm += h.exposureKm;
    }
    const exposureDensity = Math.min(1.0, totalExposureKm / Math.max(1, activeRoute?.totalDistanceKm ?? 30));
    hazardScoreRaw = Math.min(100, Math.round(severeCount * 35 + highCount * 18 + exposureDensity * 30));
  } else {
    hazardScoreRaw = Math.round(destRiskRaw * 0.4);
  }

  // D. Alert Exposure Score (Raw 0–100)
  let alertScoreRaw = 0;
  if (corridorAlerts.length > 0) {
    let critAlerts = 0;
    let highAlerts = 0;
    for (const a of corridorAlerts) {
      if (a.severity === 'CRITICAL') critAlerts++;
      else if (a.severity === 'HIGH') highAlerts++;
    }
    alertScoreRaw = Math.min(100, critAlerts * 40 + highAlerts * 25 + corridorAlerts.length * 10);
  }

  // E. Road Access / Blockage Score (Raw 0–100)
  let roadAccessScoreRaw = 0;
  if (hasValidRoute) {
    const totalKm = Math.max(1, roadBreakdown.totalKm);
    const blockedRatio = roadBreakdown.blockedKm / totalKm;
    const partialRatio = roadBreakdown.partiallyBlockedKm / totalKm;
    const cautionRatio = roadBreakdown.cautionKm / totalKm;

    if (roadBreakdown.hasBlockedSegment) {
      roadAccessScoreRaw = Math.min(100, Math.round(75 + blockedRatio * 25));
    } else {
      roadAccessScoreRaw = Math.min(100, Math.round(partialRatio * 60 + cautionRatio * 25));
    }
  } else {
    roadAccessScoreRaw = destSafety.supportingData.roadAccessSummary.blocked > 0 ? 80 : 35;
  }

  // 5. Deterministic Weighting (Sum of weights = 1.0)
  const weights = {
    routeRisk: 0.35,
    destinationRisk: 0.25,
    hazardExposure: 0.20,
    alertExposure: 0.12,
    roadAccess: 0.08,
  };

  const routeContribution = Math.round(routeRiskRaw * weights.routeRisk * 10) / 10;
  const destContribution = Math.round(destRiskRaw * weights.destinationRisk * 10) / 10;
  const hazardContribution = Math.round(hazardScoreRaw * weights.hazardExposure * 10) / 10;
  const alertContribution = Math.round(alertScoreRaw * weights.alertExposure * 10) / 10;
  const roadContribution = Math.round(roadAccessScoreRaw * weights.roadAccess * 10) / 10;

  let rawTotal = routeContribution + destContribution + hazardContribution + alertContribution + roadContribution;

  // Impassable Blockage Rule: If route has impassable blocked segment, overall risk floor is 78
  let blockagePenaltyApplied = false;
  if (roadBreakdown.hasBlockedSegment) {
    rawTotal = Math.max(rawTotal, 78);
    blockagePenaltyApplied = true;
  }

  const overallJourneyRisk = clampScore(rawTotal);
  const status = scoreToJourneyStatus(overallJourneyRisk);

  const contributions: JourneyRiskContributions = {
    routeRisk: {
      raw: routeRiskRaw,
      weight: weights.routeRisk,
      contribution: routeContribution,
    },
    destinationRisk: {
      raw: destRiskRaw,
      weight: weights.destinationRisk,
      contribution: destContribution,
    },
    hazardExposure: {
      raw: hazardScoreRaw,
      weight: weights.hazardExposure,
      contribution: hazardContribution,
    },
    alertExposure: {
      raw: alertScoreRaw,
      weight: weights.alertExposure,
      contribution: alertContribution,
    },
    roadAccess: {
      raw: roadAccessScoreRaw,
      weight: weights.roadAccess,
      contribution: roadContribution,
    },
  };

  // 6. Structured Major Risk Factors
  const riskFactors: JourneyRiskFactor[] = [];

  // Factor 1: Road blockage / caution
  if (roadBreakdown.hasBlockedSegment) {
    riskFactors.push({
      id: 'rf-road-blocked',
      category: 'ROAD',
      name: 'Blocked Roadway on Corridor',
      severity: 'CRITICAL',
      statusLabel: 'Impassable Segment',
      weight: 0.25,
      score: 95,
      weightedScore: 23.75,
      explanation: `${roadBreakdown.blockedKm} km of selected route is completely blocked or closed by civil authorities.`,
      metricValue: `${roadBreakdown.blockedKm} km blocked`,
    });
  } else if (roadBreakdown.partiallyBlockedKm > 0) {
    riskFactors.push({
      id: 'rf-road-partial',
      category: 'ROAD',
      name: 'Partial Bottleneck Obstruction',
      severity: 'HIGH',
      statusLabel: 'Single-Lane Transit',
      weight: 0.15,
      score: 65,
      weightedScore: 9.75,
      explanation: `${roadBreakdown.partiallyBlockedKm} km of corridor experiences lane restrictions and waterlogging bottlenecks.`,
      metricValue: `${roadBreakdown.partiallyBlockedKm} km partial`,
    });
  } else {
    riskFactors.push({
      id: 'rf-road-clear',
      category: 'ROAD',
      name: 'Roadway Transit Clearance',
      severity: 'LOW',
      statusLabel: 'Passable Corridors',
      weight: 0.1,
      score: 15,
      weightedScore: 1.5,
      explanation: 'All monitored route segments are reported open for public transit.',
      metricValue: `${roadBreakdown.openKm} km open`,
    });
  }

  // Factor 2: Hazard Corridor Inundation / Cyclone
  const severeHazards = hazardCorridor.filter((h) => h.risk === 'CRITICAL' || h.risk === 'HIGH');
  if (severeHazards.length > 0) {
    const topHazard = severeHazards[0];
    riskFactors.push({
      id: 'rf-hazard-corridor',
      category: 'HAZARD',
      name: `${topHazard.hazardType.replace('_', ' ')} Exposure Along Route`,
      severity: topHazard.risk,
      statusLabel: `${topHazard.risk} Risk Belt`,
      weight: 0.25,
      score: topHazard.risk === 'CRITICAL' ? 88 : 65,
      weightedScore: topHazard.risk === 'CRITICAL' ? 22 : 16.25,
      explanation: topHazard.reason,
      metricValue: `${topHazard.exposureKm} km exposure`,
    });
  } else {
    riskFactors.push({
      id: 'rf-hazard-low',
      category: 'HAZARD',
      name: 'Environmental Hazard Proximity',
      severity: 'LOW',
      statusLabel: 'Minimal Direct Exposure',
      weight: 0.15,
      score: 20,
      weightedScore: 3.0,
      explanation: 'Route polyline avoids primary flood spillways and active cyclone eye-wall swaths.',
      metricValue: 'Low exposure',
    });
  }

  // Factor 3: Active Alert Exposure
  if (corridorAlerts.length > 0) {
    const topAlert = corridorAlerts[0];
    riskFactors.push({
      id: 'rf-alerts-active',
      category: 'ALERT',
      name: `Active Advisory: ${topAlert.type}`,
      severity: topAlert.severity,
      statusLabel: `${topAlert.severity} Advisory`,
      weight: 0.2,
      score: topAlert.severity === 'CRITICAL' ? 85 : 55,
      weightedScore: topAlert.severity === 'CRITICAL' ? 17 : 11,
      explanation: `${topAlert.title} active in ${topAlert.affectedArea}. Valid for journey corridor.`,
      metricValue: `${corridorAlerts.length} alert${corridorAlerts.length > 1 ? 's' : ''}`,
    });
  } else {
    riskFactors.push({
      id: 'rf-alerts-none',
      category: 'ALERT',
      name: 'Advisory Status in Corridor',
      severity: 'LOW',
      statusLabel: 'No Active Severe Alerts',
      weight: 0.1,
      score: 10,
      weightedScore: 1.0,
      explanation: 'No high-severity emergency bulletins intersect the selected transit corridor.',
      metricValue: '0 alerts',
    });
  }

  // Factor 4: Destination Safety Comparison
  if (destSafetyScore < 50) {
    riskFactors.push({
      id: 'rf-dest-risk',
      category: 'DESTINATION',
      name: 'Elevated Destination Hazard Conditions',
      severity: destSafetyScore < 25 ? 'CRITICAL' : 'HIGH',
      statusLabel: destSafety.status,
      weight: 0.2,
      score: destRiskRaw,
      weightedScore: destRiskRaw * 0.2,
      explanation: `Arrival point ${destination.name} has a baseline safety score of ${destSafetyScore}/100.`,
      metricValue: `${destSafetyScore}/100 Safety`,
    });
  } else {
    riskFactors.push({
      id: 'rf-dest-safe',
      category: 'DESTINATION',
      name: 'Destination Baseline Stability',
      severity: 'LOW',
      statusLabel: destSafety.status,
      weight: 0.15,
      score: destRiskRaw,
      weightedScore: destRiskRaw * 0.15,
      explanation: `Destination ${destination.name} is relatively secure (${destSafetyScore}/100 safety score).`,
      metricValue: `${destSafetyScore}/100 Safety`,
    });
  }

  // Factor 5: Historical Context
  const histSummary = destSafety.supportingData.historicalContext;
  if (histSummary.eventCount > 0) {
    riskFactors.push({
      id: 'rf-historical',
      category: 'HISTORICAL',
      name: 'Historical Hazard Frequency',
      severity: histSummary.highestSeverity,
      statusLabel: `${histSummary.eventCount} Prior Events`,
      weight: 0.1,
      score: histSummary.highestSeverity === 'CRITICAL' ? 70 : 45,
      weightedScore: histSummary.highestSeverity === 'CRITICAL' ? 7 : 4.5,
      explanation: histSummary.summary,
      metricValue: `${histSummary.eventCount} records`,
    });
  }

  // 7. Explanations
  const destinationVsJourneyExplanation =
    `Destination Safety (${destSafetyScore}/100) measures localized danger at the destination point, ` +
    `whereas Journey Risk (${overallJourneyRisk}/100) measures transit vulnerability along the entire route corridor. ` +
    `A safe destination does not guarantee a safe journey if access highways are flooded or blocked, and conversely a hazardous road does not mean the final shelter or facility is compromised.`;

  const supportingExplanation = blockagePenaltyApplied
    ? `Overall Journey Risk is elevated to ${status} (${overallJourneyRisk}/100) because the route traverses blocked infrastructure (${roadBreakdown.blockedKm} km impassable).`
    : `Overall Journey Risk is calculated as ${status} (${overallJourneyRisk}/100) based on weighted contributions from Route Risk (35%), Destination Risk (25%), Hazard Corridor Exposure (20%), Active Alerts (12%), and Roadway Access (8%).`;

  // 8. Factual Route Comparison Matrix (Shortest vs Safest vs Alternative)
  const routeComparison: RouteJourneyComparisonItem[] = [];

  if (routeComparisonResults) {
    const modes: Array<{ mode: 'SHORTEST' | 'SAFEST' | 'ALTERNATIVE'; label: string }> = [
      { mode: 'SHORTEST', label: 'Shortest Route' },
      { mode: 'SAFEST', label: 'Safest Route' },
      { mode: 'ALTERNATIVE', label: 'Alternative Route' },
    ];

    for (const m of modes) {
      const res = routeComparisonResults[m.mode.toLowerCase() as keyof RouteComparison];
      if (!res.found) {
        routeComparison.push({
          mode: m.mode,
          modeLabel: m.label,
          distanceKm: 0,
          travelMinutes: 0,
          routeRisk: 0,
          destinationRisk: destRiskRaw,
          overallJourneyRisk: 0,
          status: 'VERY_HIGH',
          blockedRoadExposureKm: 0,
          majorHazardExposure: 'No route available through active network',
          found: false,
          notFoundReason: res.notFoundReason || 'No path available',
        });
        continue;
      }

      const rb = analyzeRoadConditions(res);
      let rComb = Math.round(
        res.riskScore * weights.routeRisk +
        destRiskRaw * weights.destinationRisk +
        hazardScoreRaw * weights.hazardExposure +
        alertScoreRaw * weights.alertExposure +
        (rb.hasBlockedSegment ? 85 : 20) * weights.roadAccess
      );
      if (rb.hasBlockedSegment) {
        rComb = Math.max(rComb, 78);
      }
      const finalRisk = clampScore(rComb);

      routeComparison.push({
        mode: m.mode,
        modeLabel: m.label,
        distanceKm: res.totalDistanceKm,
        travelMinutes: res.totalMinutes,
        routeRisk: res.riskScore,
        destinationRisk: destRiskRaw,
        overallJourneyRisk: finalRisk,
        status: scoreToJourneyStatus(finalRisk),
        blockedRoadExposureKm: rb.blockedKm,
        majorHazardExposure:
          rb.hasBlockedSegment
            ? 'Passes through blocked road segment'
            : res.hazardsEncountered.length > 0
            ? res.hazardsEncountered[0]
            : 'Passable corridor; minor weather exposure',
        found: true,
      });
    }
  }

  // 9. Deterministic Time Scenario Comparison Matrix
  const timeComparison: TimeJourneyComparisonItem[] = [];
  const scenarioKeys: ScenarioSlotKey[] = [
    'NOW',
    'TODAY_12',
    'TODAY_15',
    'TODAY_18',
    'TODAY_21',
    'TOMORROW_06',
    'TOMORROW_12',
    'TOMORROW_18',
    'FUTURE_48H',
  ];

  for (const slotKey of scenarioKeys) {
    const sc = DEMO_SCENARIOS[slotKey];
    if (!sc) continue;

    // Deterministic progression based on scenario multiplier
    const floodMult = sc.hazardMultipliers.flood;
    const cycloneMult = sc.hazardMultipliers.cyclone;
    const envMult = (floodMult + cycloneMult) / 2;

    const timeDestSafety = calculateDestinationSafety({
      destinationId: destination.id,
      destinationName: destination.name,
      coordinates: destination.coordinates,
      scenarioSlot: slotKey,
      selectedDate: sc.targetDate,
      selectedTime: sc.targetTime,
    });

    const timeDestRisk = clampScore(100 - timeDestSafety.safetyScore);
    const timeRouteRisk = clampScore(routeRiskRaw * envMult);

    let timeJourneyRisk = clampScore(
      timeRouteRisk * weights.routeRisk +
      timeDestRisk * weights.destinationRisk +
      hazardScoreRaw * envMult * weights.hazardExposure +
      alertScoreRaw * weights.alertExposure +
      roadAccessScoreRaw * weights.roadAccess
    );

    // If scenario marks major road closed/blocked
    if (sc.roadModifications && Object.values(sc.roadModifications).some((rm) => rm.status === 'BLOCKED' || rm.status === 'CLOSED')) {
      timeJourneyRisk = Math.max(timeJourneyRisk, 76);
    }

    timeComparison.push({
      slotKey,
      time: sc.targetTime,
      date: sc.targetDate,
      label: sc.label,
      journeyRisk: timeJourneyRisk,
      routeRisk: timeRouteRisk,
      destinationRisk: timeDestRisk,
      status: scoreToJourneyStatus(timeJourneyRisk),
      summary: sc.scenarioSummary,
    });
  }

  // 10. Edge state check
  const allRoutesBlocked =
    routeComparison.length > 0 && routeComparison.every((rc) => !rc.found || rc.blockedRoadExposureKm > 0);

  return {
    origin,
    destination,
    selectedDate,
    selectedTime,
    scenarioSlot,
    isPrototypeScenario: true,

    overallJourneyRisk,
    status,
    contributions,

    travelMinutes: activeRoute?.totalMinutes ?? 0,
    distanceKm: activeRoute?.totalDistanceKm ?? 0,

    destinationSafetyScore: destSafetyScore,
    destinationRiskScore: destRiskRaw,
    routeRiskScore: routeRiskRaw,
    destinationVsJourneyExplanation,

    riskFactors,
    supportingExplanation,

    hazardCorridor,
    roadBreakdown,
    alerts: corridorAlerts,
    groundIntelligence,
    emergencyContext,

    routeComparison,
    timeComparison,

    edgeState: {
      noRoute: !hasValidRoute,
      allRoutesBlocked,
      outOfCoverage: !NODE_BY_ID[destination.id] && !destination.coordinates,
      missingDataReason: !hasValidRoute
        ? (activeRoute?.notFoundReason || 'No connected roadway route between selected origin and destination.')
        : undefined,
    },
  };
}
