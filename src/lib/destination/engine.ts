/**
 * Destination Safety Engine
 *
 * ⚠️  PROTOTYPE DECISION SUPPORT — NOT LIVE EMERGENCY FORECAST
 *
 * Deterministic multi-factor calculation assessing the safety of a given
 * destination at a specified date and time scenario.
 *
 * Evaluates 5 explainable factors:
 *  1. Multi-Hazard & Environmental Exposure (25%)
 *  2. Active Warning Severity (20%)
 *  3. Roadway Access & Network Status (20%)
 *  4. Shelter & Resource Availability (15%)
 *  5. Historical Disaster Vulnerability (20%)
 *
 * Scale: 0 to 100, HIGHER = SAFER.
 * Statuses: SAFE (>=75) | CAUTION (50–74) | HIGH_RISK (25–49) | CRITICAL (<25)
 */

import type { LngLat } from '@/data/types';
import type { Severity } from '@/types';
import { NODE_BY_ID, DEMO_NODES } from '@/lib/routing/graph';
import { demoAlerts } from '@/data/demo/alerts';
import { demoShelters } from '@/data/demo/shelters';
import { demoRoadSegments } from '@/data/demo/roads';
import { demoHistoricalEvents } from '@/data/demo/historicalEvents';
import { computedMultiHazardRisks } from '@/data/demo/computedMultiHazardRisks';
import { DEMO_SCENARIOS, demoScenarioProvider } from './scenarios';
import type {
  DestinationRiskFactor,
  DestinationSafetyRequest,
  DestinationSafetyResult,
  DestinationSafetyStatus,
  DestinationWarningItem,
  TimeRiskScenario,
} from './types';

// ── Geographic Helpers ───────────────────────────────────────────────────────

function distanceKm(a: LngLat, b: LngLat): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aHarv =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
  return Math.round(R * c * 10) / 10;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function scoreToStatus(score: number): DestinationSafetyStatus {
  if (score >= 75) return 'SAFE';
  if (score >= 50) return 'CAUTION';
  if (score >= 25) return 'HIGH_RISK';
  return 'CRITICAL';
}

function scoreToSeverity(score: number): Severity {
  // Higher score = safer, so lower risk
  if (score >= 75) return 'LOW';
  if (score >= 50) return 'MODERATE';
  if (score >= 25) return 'HIGH';
  return 'CRITICAL';
}

// ── Resolve Location Details ────────────────────────────────────────────────

interface ResolvedDestination {
  id: string;
  name: string;
  coordinates: LngLat;
}

function resolveDestination(req: DestinationSafetyRequest): ResolvedDestination {
  const { destinationId, destinationName, coordinates } = req;

  // 1. Check known routing nodes
  if (NODE_BY_ID[destinationId]) {
    const node = NODE_BY_ID[destinationId];
    return {
      id: node.id,
      name: destinationName || node.name,
      coordinates: coordinates || node.coordinates,
    };
  }

  // 2. Check shelters
  const shelter = demoShelters.find((s) => s.id === destinationId);
  if (shelter) {
    return {
      id: shelter.id,
      name: destinationName || shelter.name,
      coordinates: coordinates || shelter.coordinates,
    };
  }

  // 3. Check road segments
  const road = demoRoadSegments.find((r) => r.id === destinationId);
  if (road && road.coordinates[0]) {
    return {
      id: road.id,
      name: destinationName || road.name,
      coordinates: coordinates || road.coordinates[0],
    };
  }

  // 4. If coordinates provided directly
  if (coordinates && coordinates.length === 2) {
    return {
      id: destinationId || 'custom-destination',
      name: destinationName || 'Selected Destination',
      coordinates,
    };
  }

  // 5. Fallback: Bhubaneswar SEOC
  const fallback = DEMO_NODES[0] ?? {
    id: 'node-seoc-bbsr',
    name: 'Bhubaneswar Central Sector',
    coordinates: [85.8245, 20.2756],
  };

  return {
    id: fallback.id,
    name: destinationName || fallback.name,
    coordinates: fallback.coordinates,
  };
}

// ── Factor 1: Multi-Hazard & Environmental Exposure (Weight: 0.25) ──────────

function evaluateHazardExposure(
  coords: LngLat,
  scenario: TimeRiskScenario,
): DestinationRiskFactor {
  const weight = 0.25;

  // Find nearest multi-hazard zone center or match by geography
  let baseHazardScore = 20; // default baseline low hazard

  // Check if near Puri coast (approx [85.83, 19.81])
  const distPuri = distanceKm(coords, [85.83, 19.81]);
  const distCuttack = distanceKm(coords, [85.88, 20.47]);
  const distBbsr = distanceKm(coords, [85.82, 20.27]);
  const distVizag = distanceKm(coords, [83.3, 17.7]);

  if (distPuri <= 25) {
    baseHazardScore = 65; // High coastal cyclone vulnerability
  } else if (distCuttack <= 20) {
    baseHazardScore = 55; // Riverine flood vulnerability
  } else if (distBbsr <= 20) {
    baseHazardScore = 35; // Urban inland
  } else if (distVizag <= 25) {
    baseHazardScore = 45; // Coastal hills
  }

  // Apply scenario multiplier (combines flood + cyclone multipliers)
  const combinedMultiplier =
    scenario.hazardMultipliers.flood * 0.5 + scenario.hazardMultipliers.cyclone * 0.5;
  const scenarioHazard = clamp(Math.round(baseHazardScore * combinedMultiplier), 0, 100);

  // Safety score: 100 - hazardScore
  const factorSafetyScore = clamp(100 - scenarioHazard, 5, 98);
  const severity = scoreToSeverity(factorSafetyScore);

  let statusLabel = 'Low Exposure';
  if (factorSafetyScore < 25) statusLabel = 'Extreme Hazard Threat';
  else if (factorSafetyScore < 50) statusLabel = 'High Hazard Exposure';
  else if (factorSafetyScore < 75) statusLabel = 'Moderate Hazard Exposure';

  return {
    id: 'hazard-exposure',
    name: 'Multi-Hazard & Weather Exposure',
    weight,
    score: factorSafetyScore,
    weightedScore: Math.round(weight * factorSafetyScore * 10) / 10,
    severity,
    statusLabel,
    explanation: `Rainfall ${scenario.rainfallIntensityMmH} mm/h with ${scenario.cycloneWindKmh} km/h winds and storm surge ${scenario.stormSurgeMeters}m under selected scenario.`,
    metricValue: `${scenario.rainfallIntensityMmH} mm/h rain · ${scenario.cycloneWindKmh} km/h wind`,
  };
}

// ── Factor 2: Active Warning Severity (Weight: 0.20) ────────────────────────

function evaluateActiveWarnings(
  coords: LngLat,
  scenario: TimeRiskScenario,
): { factor: DestinationRiskFactor; warnings: DestinationWarningItem[] } {
  const weight = 0.2;

  // Filter alerts by active IDs in this scenario
  const relevantAlerts = demoAlerts.filter((al) => {
    if (!scenario.activeAlertIds.includes(al.id)) return false;
    const dist = distanceKm(coords, al.coordinates);
    return dist <= 55; // within 55 km radius
  });

  const warningItems: DestinationWarningItem[] = relevantAlerts.map((al) => {
    let recAction = 'Monitor local broadcasts and prepare emergency supplies.';
    if (al.severity === 'CRITICAL') {
      recAction = 'Mandatory evacuation of low ground. Stay away from coastlines and flooded underpasses.';
    } else if (al.severity === 'HIGH') {
      recAction = 'Avoid non-essential transit. Secure outdoor equipment and shelter in robust structure.';
    }

    return {
      id: al.id,
      type: al.type,
      severity: al.severity,
      title: al.title,
      message: al.message,
      affectedArea: al.regionName,
      validPeriod: 'Active / Immediate',
      category: al.type,
      recommendedAction: recAction,
    };
  });

  let warningSafetyScore = 95;
  let statusLabel = 'No Critical Warnings';

  if (relevantAlerts.some((a) => a.severity === 'CRITICAL')) {
    warningSafetyScore = 15;
    statusLabel = 'Red Alert / Critical Warning Active';
  } else if (relevantAlerts.some((a) => a.severity === 'HIGH')) {
    warningSafetyScore = 40;
    statusLabel = 'High Warning Active';
  } else if (relevantAlerts.some((a) => a.severity === 'MODERATE')) {
    warningSafetyScore = 70;
    statusLabel = 'Advisory / Moderate Warning';
  }

  const factor: DestinationRiskFactor = {
    id: 'active-warnings',
    name: 'Active Emergency Warnings',
    weight,
    score: warningSafetyScore,
    weightedScore: Math.round(weight * warningSafetyScore * 10) / 10,
    severity: scoreToSeverity(warningSafetyScore),
    statusLabel,
    explanation:
      relevantAlerts.length > 0
        ? `${relevantAlerts.length} official alert(s) in destination zone: ${relevantAlerts.map((a) => a.title).join('; ')}.`
        : 'No high-severity disaster warnings currently in effect for this destination sector.',
    metricValue: `${relevantAlerts.length} Active Alert${relevantAlerts.length !== 1 ? 's' : ''}`,
  };

  return { factor, warnings: warningItems };
}

// ── Factor 3: Roadway Access & Network Status (Weight: 0.20) ────────────────

function evaluateRoadwayAccess(
  coords: LngLat,
  scenario: TimeRiskScenario,
): { factor: DestinationRiskFactor; roadSummary: DestinationSafetyResult['supportingData']['roadAccessSummary'] } {
  const weight = 0.2;

  // Nearby road segments (within 40km)
  const nearbyRoads = demoRoadSegments.filter((rd) => {
    if (!rd.coordinates[0]) return false;
    const dist = distanceKm(coords, rd.coordinates[0]);
    return dist <= 40;
  });

  let openCount = 0;
  let cautionCount = 0;
  let partialCount = 0;
  let blockedCount = 0;
  let totalScore = 0;

  if (nearbyRoads.length === 0) {
    // If no roads within radius, assume standard arterial access
    totalScore = 85;
    openCount = 1;
  } else {
    for (const rd of nearbyRoads) {
      // Check scenario road modifications
      const mod = scenario.roadModifications?.[rd.id];
      const effStatus = mod ? mod.status : rd.status;

      if (effStatus === 'OPEN') {
        openCount++;
        totalScore += 95;
      } else if (effStatus === 'CAUTION') {
        cautionCount++;
        totalScore += 65;
      } else if (effStatus === 'PARTIALLY_BLOCKED') {
        partialCount++;
        totalScore += 40;
      } else {
        // BLOCKED or CLOSED
        blockedCount++;
        totalScore += 10;
      }
    }
    totalScore = Math.round(totalScore / nearbyRoads.length);
  }

  const factorSafetyScore = clamp(totalScore, 10, 95);
  const severity = scoreToSeverity(factorSafetyScore);

  let statusLabel = 'Roads Passable';
  if (blockedCount > 0) statusLabel = 'Access Severely Impeded';
  else if (partialCount > 0) statusLabel = 'Partial Road Disruptions';
  else if (cautionCount > 0) statusLabel = 'Hazardous Transit Conditions';

  const factor: DestinationRiskFactor = {
    id: 'road-access',
    name: 'Roadway Accessibility & Corridor Status',
    weight,
    score: factorSafetyScore,
    weightedScore: Math.round(weight * factorSafetyScore * 10) / 10,
    severity,
    statusLabel,
    explanation:
      blockedCount > 0
        ? `${blockedCount} nearby arterial road(s) impassable or closed due to disaster blockages.`
        : partialCount > 0
        ? `${partialCount} road(s) experiencing single-lane restrictions and transit delays.`
        : 'Corridor transit operational with normal to light precautionary slowdowns.',
    metricValue: `${nearbyRoads.length} Monitored Roads (${openCount} Open, ${blockedCount} Blocked)`,
  };

  const roadSummary = {
    totalNearby: nearbyRoads.length,
    open: openCount,
    caution: cautionCount,
    partiallyBlocked: partialCount,
    blocked: blockedCount,
    status: statusLabel,
  };

  return { factor, roadSummary };
}

// ── Factor 4: Shelter & Resource Availability (Weight: 0.15) ────────────────

function evaluateShelterAvailability(
  coords: LngLat,
): { factor: DestinationRiskFactor; nearest?: DestinationSafetyResult['supportingData']['nearestShelter'] } {
  const weight = 0.15;

  let nearestShelter: (typeof demoShelters)[0] | null = null;
  let minDistance = Infinity;

  for (const sh of demoShelters) {
    const dist = distanceKm(coords, sh.coordinates);
    if (dist < minDistance) {
      minDistance = dist;
      nearestShelter = sh;
    }
  }

  let shelterScore = 70;
  let statusLabel = 'Shelter Access Available';

  if (nearestShelter) {
    const occupancyPct = Math.round((nearestShelter.occupancy / nearestShelter.capacity) * 100);

    if (minDistance > 25) {
      shelterScore = 45;
      statusLabel = 'Limited Shelter Proximity';
    } else if (nearestShelter.status === 'FULL' || occupancyPct >= 95) {
      shelterScore = 30;
      statusLabel = 'Nearest Shelter At Capacity';
    } else if (occupancyPct >= 75) {
      shelterScore = 60;
      statusLabel = 'Shelter Near Capacity';
    } else {
      shelterScore = 90;
      statusLabel = 'Available Emergency Shelter Capacity';
    }

    const factor: DestinationRiskFactor = {
      id: 'shelter-capacity',
      name: 'Emergency Shelter & Relief Proximity',
      weight,
      score: shelterScore,
      weightedScore: Math.round(weight * shelterScore * 10) / 10,
      severity: scoreToSeverity(shelterScore),
      statusLabel,
      explanation: `${nearestShelter.name} is ${minDistance} km away (${occupancyPct}% occupied, capacity: ${nearestShelter.capacity}).`,
      metricValue: `${minDistance} km to ${nearestShelter.name} (${occupancyPct}% full)`,
    };

    const nearestData = {
      id: nearestShelter.id,
      name: nearestShelter.name,
      distanceKm: minDistance,
      status: nearestShelter.status,
      capacity: nearestShelter.capacity,
      occupancy: nearestShelter.occupancy,
      occupancyPct,
      hasMedical: nearestShelter.hasMedical,
    };

    return { factor, nearest: nearestData };
  }

  return {
    factor: {
      id: 'shelter-capacity',
      name: 'Emergency Shelter & Relief Proximity',
      weight,
      score: 50,
      weightedScore: Math.round(weight * 50 * 10) / 10,
      severity: 'MODERATE',
      statusLabel: 'No Shelters in Vicinity',
      explanation: 'No registered disaster shelters within 30 km radius of destination.',
      metricValue: 'No shelter data',
    },
  };
}

// ── Factor 5: Historical Disaster Context (Weight: 0.20) ────────────────────

function evaluateHistoricalContext(
  coords: LngLat,
): { factor: DestinationRiskFactor; context: DestinationSafetyResult['supportingData']['historicalContext'] } {
  const weight = 0.2;

  // Filter historical events within ~50km
  const nearbyEvents = demoHistoricalEvents.filter((ev) => {
    const dist = distanceKm(coords, ev.coordinates);
    return dist <= 50;
  });

  const eventCount = nearbyEvents.length;
  const hasCritical = nearbyEvents.some((e) => e.severity === 'CRITICAL');
  const hasHigh = nearbyEvents.some((e) => e.severity === 'HIGH');

  let historyScore = 80;
  let statusLabel = 'Low Historical Recurrence';

  if (hasCritical && eventCount >= 2) {
    historyScore = 45;
    statusLabel = 'High Historical Cyclone / Flood Frequency';
  } else if (hasCritical || hasHigh) {
    historyScore = 65;
    statusLabel = 'Moderate Historical Vulnerability';
  }

  const factor: DestinationRiskFactor = {
    id: 'historical-risk',
    name: 'Historical Disaster Vulnerability',
    weight,
    score: historyScore,
    weightedScore: Math.round(weight * historyScore * 10) / 10,
    severity: scoreToSeverity(historyScore),
    statusLabel,
    explanation:
      eventCount > 0
        ? `Region has ${eventCount} recorded major historical disaster events (e.g., ${nearbyEvents[0]?.name}).`
        : 'Area has minimal recorded catastrophic disaster landfall history in demo archives.',
    metricValue: `${eventCount} Historical Events (${hasCritical ? 'Critical History' : 'Standard History'})`,
  };

  const contextData = {
    eventCount,
    highestSeverity: hasCritical ? ('CRITICAL' as Severity) : hasHigh ? ('HIGH' as Severity) : ('MODERATE' as Severity),
    summary:
      eventCount > 0
        ? `${eventCount} past disaster events documented in this corridor. High resilience infrastructure advised.`
        : 'No high-frequency historical disaster surge recorded in repository records.',
  };

  return { factor, context: contextData };
}

// ── Synthesize 3–5 Concise Bullet Reasons ───────────────────────────────────

function generateReasons(
  factors: DestinationRiskFactor[],
  scenario: TimeRiskScenario,
  warnings: DestinationWarningItem[],
  safetyScore: number,
): string[] {
  const reasons: string[] = [];

  // 1. Warnings reason
  if (warnings.length > 0) {
    reasons.push(
      `Active ${warnings[0].severity} alert: "${warnings[0].title}". Mandatory compliance with local emergency directives.`
    );
  } else {
    reasons.push('No active high-severity disaster alerts currently issued for this destination sector.');
  }

  // 2. Weather & Hazard reason
  if (scenario.rainfallIntensityMmH >= 50 || scenario.cycloneWindKmh >= 90) {
    reasons.push(
      `Severe weather conditions under ${scenario.label}: rainfall intensity at ${scenario.rainfallIntensityMmH} mm/h and winds of ${scenario.cycloneWindKmh} km/h.`
    );
  } else {
    reasons.push(
      `Environmental hazard exposure is controlled (${scenario.rainfallIntensityMmH} mm/h rain, wind speed ${scenario.cycloneWindKmh} km/h).`
    );
  }

  // 3. Road status reason
  const roadFactor = factors.find((f) => f.id === 'road-access');
  if (roadFactor && roadFactor.score < 50) {
    reasons.push('Main access roadways are partially blocked or impassable due to waterlogging and debris.');
  } else {
    reasons.push('Primary ingress and egress road corridors remain passable under standard travel conditions.');
  }

  // 4. Shelter reason
  const shelterFactor = factors.find((f) => f.id === 'shelter-capacity');
  if (shelterFactor) {
    reasons.push(shelterFactor.explanation);
  }

  // 5. Historical context
  const histFactor = factors.find((f) => f.id === 'historical-risk');
  if (histFactor && histFactor.score < 60) {
    reasons.push('Historical disaster records show elevated vulnerability to cyclonic storm surge and river floods.');
  }

  return reasons.slice(0, 5);
}

// ── Generate Timeline for Destination ───────────────────────────────────────

export function generateDestinationTimeline(
  destinationId: string,
  coords: LngLat,
): DestinationSafetyResult['timeline'] {
  const slots: Array<{
    slotKey: keyof typeof DEMO_SCENARIOS;
    time: string;
    date: string;
  }> = [
    { slotKey: 'TODAY_12', time: '12:00', date: 'Today' },
    { slotKey: 'TODAY_15', time: '15:00', date: 'Today' },
    { slotKey: 'TODAY_18', time: '18:00', date: 'Today' },
    { slotKey: 'TODAY_21', time: '21:00', date: 'Today' },
    { slotKey: 'TOMORROW_06', time: '06:00', date: 'Tomorrow' },
    { slotKey: 'TOMORROW_12', time: '12:00', date: 'Tomorrow' },
    { slotKey: 'TOMORROW_18', time: '18:00', date: 'Tomorrow' },
  ];

  return slots.map(({ slotKey, time, date }) => {
    const sc = DEMO_SCENARIOS[slotKey];
    const hazardF = evaluateHazardExposure(coords, sc);
    const { factor: warnF } = evaluateActiveWarnings(coords, sc);
    const { factor: roadF } = evaluateRoadwayAccess(coords, sc);
    const { factor: shF } = evaluateShelterAvailability(coords);
    const { factor: histF } = evaluateHistoricalContext(coords);

    const score = Math.round(
      hazardF.weightedScore +
      warnF.weightedScore +
      roadF.weightedScore +
      shF.weightedScore +
      histF.weightedScore
    );

    const clampedScore = clamp(score, 5, 98);
    const status = scoreToStatus(clampedScore);

    return {
      time,
      date,
      score: clampedScore,
      status,
      summary: `${sc.rainfallIntensityMmH} mm/h rain, wind ${sc.cycloneWindKmh} km/h`,
    };
  });
}

// ── Public Engine API ───────────────────────────────────────────────────────

/**
 * Calculates Destination Safety Score (0–100, higher = safer)
 * using deterministic scenario and localized disaster intelligence.
 */
export function calculateDestinationSafety(
  req: DestinationSafetyRequest
): DestinationSafetyResult {
  const dest = resolveDestination(req);

  // Determine scenario
  let scenario: TimeRiskScenario;
  if (req.scenarioSlot && req.scenarioSlot in DEMO_SCENARIOS) {
    scenario = DEMO_SCENARIOS[req.scenarioSlot as keyof typeof DEMO_SCENARIOS];
  } else {
    scenario = demoScenarioProvider.getScenario(req.selectedDate, req.selectedTime);
  }

  // 1. Hazard exposure
  const hazardFactor = evaluateHazardExposure(dest.coordinates, scenario);

  // 2. Warnings
  const { factor: warningFactor, warnings } = evaluateActiveWarnings(dest.coordinates, scenario);

  // 3. Roadway access
  const { factor: roadFactor, roadSummary } = evaluateRoadwayAccess(dest.coordinates, scenario);

  // 4. Shelter access
  const { factor: shelterFactor, nearest: nearestShelter } = evaluateShelterAvailability(dest.coordinates);

  // 5. Historical context
  const { factor: historicalFactor, context: historicalContext } = evaluateHistoricalContext(dest.coordinates);

  const factors: DestinationRiskFactor[] = [
    hazardFactor,
    warningFactor,
    roadFactor,
    shelterFactor,
    historicalFactor,
  ];

  // Weighted sum
  const rawScore = factors.reduce((sum, f) => sum + f.weightedScore, 0);
  const safetyScore = clamp(Math.round(rawScore), 5, 98);
  const riskScore = 100 - safetyScore;
  const status = scoreToStatus(safetyScore);

  // Reasons
  const reasons = generateReasons(factors, scenario, warnings, safetyScore);

  // River stage text
  let riverStageStatus = 'Normal flow';
  if (scenario.riverLevelMeters >= 4.0) riverStageStatus = 'Severe danger mark breach';
  else if (scenario.riverLevelMeters >= 2.5) riverStageStatus = 'Above warning level';
  else if (scenario.riverLevelMeters >= 1.5) riverStageStatus = 'Elevated flow';

  // Compare with "Now" scenario if user selected a future time
  let deltaFromCurrent: DestinationSafetyResult['deltaFromCurrent'];
  if (scenario.slotKey !== 'NOW') {
    const nowScenario = DEMO_SCENARIOS.NOW;
    const nowHazard = evaluateHazardExposure(dest.coordinates, nowScenario);
    const { factor: nowWarn } = evaluateActiveWarnings(dest.coordinates, nowScenario);
    const { factor: nowRoad } = evaluateRoadwayAccess(dest.coordinates, nowScenario);
    const nowScore = clamp(
      Math.round(
        nowHazard.weightedScore +
        nowWarn.weightedScore +
        nowRoad.weightedScore +
        shelterFactor.weightedScore +
        historicalFactor.weightedScore
      ),
      5,
      98
    );

    const delta = safetyScore - nowScore;
    const changeDirection = delta > 0 ? 'improves' : delta < 0 ? 'deteriorates' : 'remains steady';
    const deltaSummary =
      delta !== 0
        ? `Safety score ${changeDirection} by ${Math.abs(delta)} points from current conditions (${nowScore} → ${safetyScore}) due to ${
            scenario.cycloneWindKmh > nowScenario.cycloneWindKmh ? 'intensifying winds and rainfall' : 'receding floodwaters and easing storm conditions'
          }.`
        : `Safety score remains steady at ${safetyScore} under the ${scenario.label} scenario.`;

    deltaFromCurrent = {
      baselineScore: nowScore,
      scoreDelta: delta,
      summary: deltaSummary,
    };
  }

  // Generate timeline
  const timeline = generateDestinationTimeline(dest.id, dest.coordinates);

  return {
    destinationId: dest.id,
    destinationName: dest.name,
    coordinates: dest.coordinates,
    selectedDate: req.selectedDate || scenario.targetDate,
    selectedTime: req.selectedTime || scenario.targetTime,
    scenario,
    isPrototypeScenario: true,
    safetyScore,
    riskScore,
    status,
    factors,
    reasons,
    warnings,
    supportingData: {
      rainfallMmH: scenario.rainfallIntensityMmH,
      windKmh: scenario.cycloneWindKmh,
      riverLevelMeters: scenario.riverLevelMeters,
      riverStageStatus,
      nearestShelter,
      roadAccessSummary: roadSummary,
      historicalContext,
    },
    deltaFromCurrent,
    timeline,
  };
}
