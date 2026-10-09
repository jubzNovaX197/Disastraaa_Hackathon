/**
 * Response Simulator — Deterministic Simulation Engine
 *
 * Models changing disaster conditions without modifying real-world operational state.
 * Transforms baseline intelligence:
 * Scenario Inputs → Hazard Modifiers → Risk → Impact → Roads → Shelters → Resources → Response
 *
 * Professional emergency operations decision support.
 */

import { demoRoadSegments } from '@/data/demo';
import { aggregateCommandCenterData } from '@/lib/commandCenter/aggregator';
import { buildResponseCoordinationData } from '@/lib/response/engine';
import { formatNumber } from '@/lib/utils';
import type { Severity } from '@/types';
import type {
  ImpactedRoadSegment,
  ScenarioConfiguration,
  SimulatedAlertItem,
  SimulatedImpactBreakdown,
  SimulatedResourceItem,
  SimulatedResponseSummary,
  SimulatedRiskBreakdown,
  SimulatedRoadStatus,
  SimulatedShelterItem,
  SimulatedShelterSummary,
  SimulatedTimelineStep,
  SimulationMetricChange,
  SimulationResult,
} from './types';

function createMetricChange(baseline: number, simulated: number): SimulationMetricChange {
  const delta = Math.round((simulated - baseline) * 10) / 10;
  const percentChange =
    baseline > 0 ? Math.round((delta / baseline) * 100) : simulated > 0 ? 100 : 0;
  return {
    baseline: Math.round(baseline * 10) / 10,
    simulated: Math.round(simulated * 10) / 10,
    delta,
    percentChange,
  };
}

export function runSimulation(
  config: ScenarioConfiguration,
  environment: 'REAL' | 'DEMO' = 'DEMO',
): SimulationResult {
  const isReal = environment === 'REAL';
  const ccData = aggregateCommandCenterData({ environment });
  const respData = buildResponseCoordinationData(ccData, undefined, environment);
  const allRoads = isReal ? [] : demoRoadSegments;

  // ── 1. Target Region Resolution ─────────────────────────────────────────────
  const isAllRegions = config.targetRegionId === 'ALL';
  const targetLocation = !isAllRegions
    ? ccData.priorityLocations.find((l) => l.id === config.targetRegionId)
    : null;

  const targetRegionName = isAllRegions
    ? isReal
      ? ccData.priorityLocations.length > 0
        ? 'All Active Real Operational Corridors'
        : 'No Operational Corridors Currently Affected'
      : 'All Operational Corridors (Statewide Multi-Zone)'
    : targetLocation
      ? targetLocation.name
      : 'Selected Operational Sector';

  // ── 2. Intensity & Duration Scaling Factors ─────────────────────────────────
  const intensityMultipliers: Record<ScenarioConfiguration['intensity'], number> = {
    LOW: 1.12,
    MODERATE: 1.28,
    HIGH: 1.55,
    EXTREME: 1.95,
  };

  const durationMultipliers: Record<ScenarioConfiguration['duration'], number> = {
    '6h': 0.92,
    '12h': 1.0,
    '24h': 1.15,
    '48h': 1.32,
    '72h': 1.5,
  };

  const intensityFactor = intensityMultipliers[config.intensity] || 1.3;
  const durationFactor = durationMultipliers[config.duration] || 1.1;
  const popFactor = config.populationExposureMultiplier || 1.0;

  // Hazard bias
  const floodBias = config.hazard === 'FLOOD' ? 1.35 : config.hazard === 'MULTI_HAZARD' ? 1.2 : 0.9;
  const cycloneBias = config.hazard === 'CYCLONE' ? 1.4 : config.hazard === 'MULTI_HAZARD' ? 1.25 : 0.85;
  const multiBias = config.hazard === 'MULTI_HAZARD' ? 1.45 : 1.15;

  // Advanced factors
  const rainEffect = 1 + (config.advanced.rainfallMm24h / 300) * 0.45;
  const riverEffect = 1 + (config.advanced.riverSurgeMeters / 4.0) * 0.4;
  const windEffect = 1 + (config.advanced.windSpeedKmh / 220) * 0.5;
  const surgeEffect = 1 + (config.advanced.stormSurgeMeters / 5.0) * 0.45;
  const shelterDemandMult = (config.advanced.shelterPressureFactor || 1.0) * popFactor;
  const resourceDeficitMult = 1 + (config.advanced.resourceDeficitPct || 0) / 100;

  // Composite compound multiplier for general impact
  const generalImpactMultiplier =
    ((intensityFactor * durationFactor * popFactor) / 1.0) *
    (config.hazard === 'FLOOD'
      ? rainEffect * riverEffect
      : config.hazard === 'CYCLONE'
        ? windEffect * surgeEffect
        : ((rainEffect + windEffect + surgeEffect) / 3) * 1.1);

  // ── 3. Risk Simulation ──────────────────────────────────────────────────────
  const baseAvgRisk = targetLocation
    ? targetLocation.riskScore
    : Math.round(
        ccData.priorityLocations.reduce((s, l) => s + l.riskScore, 0) /
          Math.max(1, ccData.priorityLocations.length),
      );

  const baseFloodRisk = targetLocation?.floodRiskScore ?? 62;
  const baseCycloneRisk = targetLocation?.cycloneRiskScore ?? 58;

  const simRiskRaw = Math.min(
    99,
    Math.round(
      baseAvgRisk *
        (config.intensity === 'EXTREME' ? 1.45 : config.intensity === 'HIGH' ? 1.28 : 1.12) *
        (config.hazard === 'MULTI_HAZARD' ? 1.1 : 1.0) +
        (config.advanced.rainfallMm24h > 150 ? 6 : 0) +
        (config.advanced.windSpeedKmh > 150 ? 7 : 0),
    ),
  );

  const simFloodRiskRaw = Math.min(
    99,
    Math.round(baseFloodRisk * floodBias * rainEffect * riverEffect),
  );

  const simCycloneRiskRaw = Math.min(
    99,
    Math.round(baseCycloneRisk * cycloneBias * windEffect * surgeEffect),
  );

  const simMultiRiskRaw = Math.min(
    99,
    Math.round(
      ((simFloodRiskRaw * 0.5 + simCycloneRiskRaw * 0.5) * multiBias),
    ),
  );

  const deriveSeverity = (score: number): Severity => {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MODERATE';
    return 'LOW';
  };

  const keyDrivers: string[] = [];
  if (config.advanced.rainfallMm24h > 50) {
    keyDrivers.push(
      `Rainfall intensity (+${config.advanced.rainfallMm24h}mm/24h) accelerates urban and deltaic catchment saturation.`,
    );
  }
  if (config.advanced.riverSurgeMeters > 0.5) {
    keyDrivers.push(
      `River gauge increase (+${config.advanced.riverSurgeMeters}m) breaches embankment freeboard thresholds in lowlands.`,
    );
  }
  if (config.advanced.windSpeedKmh > 60) {
    keyDrivers.push(
      `Sustained wind speeds (${config.advanced.windSpeedKmh} km/h) trigger widespread treefall and transmission line damage.`,
    );
  }
  if (config.advanced.stormSurgeMeters > 1.0) {
    keyDrivers.push(
      `Coastal tidal surge (+${config.advanced.stormSurgeMeters}m) pushes seawater 2.5–4.0 km inland into littoral settlements.`,
    );
  }
  if (config.duration === '48h' || config.duration === '72h') {
    keyDrivers.push(
      `Prolonged ${config.duration} duration compounds subsoil liquefaction and logistical replenishment fatigue.`,
    );
  }
  if (keyDrivers.length === 0) {
    keyDrivers.push(
      `${config.intensity} intensity hazard scenario elevates operational strain across priority response sectors.`,
    );
  }

  const simulatedRisk: SimulatedRiskBreakdown = {
    composite: createMetricChange(baseAvgRisk, simRiskRaw),
    flood: createMetricChange(baseFloodRisk, simFloodRiskRaw),
    cyclone: createMetricChange(baseCycloneRisk, simCycloneRiskRaw),
    multiHazard: createMetricChange(
      Math.round((baseFloodRisk + baseCycloneRisk) / 2),
      simMultiRiskRaw,
    ),
    baselineSeverity: deriveSeverity(baseAvgRisk),
    simulatedSeverity: deriveSeverity(simRiskRaw),
    keyDrivers,
  };

  // ── 4. Impact Simulation ────────────────────────────────────────────────────
  const basePop = targetLocation
    ? targetLocation.populationExposed
    : ccData.priorityLocations.reduce((s, l) => s + l.populationExposed, 0);

  const baseBld = targetLocation
    ? targetLocation.impact.buildings
    : ccData.priorityLocations.reduce((s, l) => s + l.impact.buildings, 0);

  const baseRoadsKm = targetLocation
    ? targetLocation.impact.roadsKm
    : ccData.priorityLocations.reduce((s, l) => s + l.impact.roadsKm, 0);

  const baseSchools = targetLocation
    ? targetLocation.impact.schools
    : ccData.priorityLocations.reduce((s, l) => s + l.impact.schools, 0);

  const baseHospitals = targetLocation
    ? targetLocation.impact.hospitals
    : ccData.priorityLocations.reduce((s, l) => s + l.impact.hospitals, 0);

  const baseShelters = targetLocation ? 3 : ccData.shelterOperations.totalShelters;

  const simPop = Math.round(basePop * popFactor * (1 + (generalImpactMultiplier - 1) * 0.45));
  const simBld = Math.round(baseBld * generalImpactMultiplier);
  const simRoadsKm = Math.round(baseRoadsKm * (1 + (generalImpactMultiplier - 1) * 0.7) * 10) / 10;
  const simSchools = Math.round(baseSchools * (1 + (generalImpactMultiplier - 1) * 0.5));
  const simHospitals = Math.round(baseHospitals * (1 + (generalImpactMultiplier - 1) * 0.35));
  const simShelters = Math.round(baseShelters * (1 + (generalImpactMultiplier - 1) * 0.25));

  const simulatedImpact: SimulatedImpactBreakdown = {
    population: createMetricChange(basePop, simPop),
    buildings: createMetricChange(baseBld, simBld),
    roadsKm: createMetricChange(baseRoadsKm, simRoadsKm),
    schools: createMetricChange(baseSchools, simSchools),
    hospitals: createMetricChange(baseHospitals, simHospitals),
    shelters: createMetricChange(baseShelters, simShelters),
  };

  // ── 5. Shelter Simulation ───────────────────────────────────────────────────
  const baseShelterItems = ccData.shelterOperations.items;
  let totalCap = 0;
  let baseDemandSum = 0;
  let simDemandSum = 0;
  let highPressCount = 0;

  const simulatedShelterItems: SimulatedShelterItem[] = baseShelterItems.map((sh) => {
    totalCap += sh.capacity;
    baseDemandSum += sh.projectedDemand;

    const simDemand = Math.round(
      sh.projectedDemand *
        intensityFactor *
        shelterDemandMult *
        (config.hazard === 'CYCLONE' ? 1.25 : 1.1),
    );
    simDemandSum += simDemand;

    const gap = Math.max(0, simDemand - sh.capacity);
    const utilization = sh.capacity > 0 ? (simDemand / sh.capacity) * 100 : 100;
    const simStatus: 'AVAILABLE' | 'PRESSURE' | 'SHORTAGE' =
      utilization > 100 ? 'SHORTAGE' : utilization > 80 ? 'PRESSURE' : 'AVAILABLE';

    if (simStatus === 'PRESSURE' || simStatus === 'SHORTAGE') {
      highPressCount++;
    }

    return {
      id: sh.id,
      name: sh.name,
      location: sh.location,
      capacity: sh.capacity,
      baselineDemand: sh.projectedDemand,
      simulatedDemand: simDemand,
      projectedGap: gap,
      baselineStatus: sh.status,
      simulatedStatus: simStatus,
      isNewPressure: sh.status === 'AVAILABLE' && simStatus !== 'AVAILABLE',
    };
  });

  const simulatedShelters: SimulatedShelterSummary = {
    totalCapacity: totalCap,
    baselineDemand: baseDemandSum,
    simulatedDemand: simDemandSum,
    demandDelta: simDemandSum - baseDemandSum,
    projectedCapacityGap: Math.max(0, simDemandSum - totalCap),
    highPressureCount: highPressCount,
    items: simulatedShelterItems,
  };

  // ── 6. Resource Simulation ──────────────────────────────────────────────────
  const baseResItems = respData.resources;

  const simulatedResources: SimulatedResourceItem[] = baseResItems.map((res) => {
    // Hazard-specific resource demand amplification
    let resAmp = 1.0;
    if (res.category === 'WATER' || res.category === 'FOOD') {
      resAmp = intensityFactor * popFactor * (config.duration === '48h' || config.duration === '72h' ? 1.35 : 1.15);
    } else if (res.category === 'BOATS') {
      resAmp = config.hazard === 'FLOOD' || config.advanced.stormSurgeMeters > 1.0 ? 1.7 : 1.1;
    } else if (res.category === 'RESCUE') {
      resAmp = intensityFactor * 1.35;
    } else if (res.category === 'MEDICAL') {
      resAmp = intensityFactor * 1.25 * popFactor;
    } else if (res.category === 'VEHICLES') {
      resAmp = config.advanced.roadDisruptionLevel === 'CRITICAL' ? 1.5 : 1.2;
    } else if (res.category === 'KITS') {
      resAmp = intensityFactor * 1.2;
    } else {
      resAmp = intensityFactor * 1.15;
    }

    const simReq = Math.round(res.required * resAmp);
    const availStock = Math.round(res.available * (1 - (config.advanced.resourceDeficitPct / 100)));
    const addlReq = Math.max(0, simReq - res.required);
    const gap = Math.max(0, simReq - availStock);
    const coverage = simReq > 0 ? Math.round((availStock / simReq) * 100) : 100;

    const simStatus =
      coverage >= 90 ? 'AVAILABLE' : coverage >= 60 ? 'LIMITED' : 'SHORTAGE';

    return {
      category: res.category,
      name: res.name,
      unit: res.unit,
      icon: res.icon,
      baselineRequired: res.required,
      simulatedRequired: simReq,
      additionalRequired: addlReq,
      availableStock: availStock,
      projectedGap: gap,
      baselineStatus: res.status,
      simulatedStatus: simStatus,
    };
  });

  // ── 7. Road Network Impact Simulation ───────────────────────────────────────
  let baseOpen = 0;
  let baseCaution = 0;
  let basePartial = 0;
  let baseBlocked = 0;
  let baseClosed = 0;

  allRoads.forEach((r) => {
    if (r.status === 'OPEN') baseOpen++;
    else if (r.status === 'CAUTION') baseCaution++;
    else if (r.status === 'PARTIALLY_BLOCKED') basePartial++;
    else if (r.status === 'BLOCKED') baseBlocked++;
    else if (r.status === 'CLOSED') baseClosed++;
  });

  // Degrade roads based on intensity & advanced road disruption
  const roadShiftLevel =
    config.advanced.roadDisruptionLevel === 'CRITICAL'
      ? 3
      : config.advanced.roadDisruptionLevel === 'SEVERE' || config.intensity === 'EXTREME'
        ? 2
        : config.advanced.roadDisruptionLevel === 'ELEVATED' || config.intensity === 'HIGH'
          ? 1
          : 0;

  const simOpen = Math.max(1, Math.round(baseOpen - roadShiftLevel * 1.8));
  const simCaution = Math.max(1, Math.round(baseCaution + (baseOpen - simOpen) * 0.4));
  const simPartial = Math.round(basePartial + roadShiftLevel * 1.1);
  const simBlocked = Math.round(baseBlocked + roadShiftLevel * 1.4);
  const simClosed = Math.round(baseClosed + (roadShiftLevel >= 2 ? 2 : 1));

  const impactedSegments: ImpactedRoadSegment[] = allRoads
    .filter((r) => r.status === 'BLOCKED' || r.status === 'PARTIALLY_BLOCKED' || r.status === 'CLOSED')
    .slice(0, 5)
    .map((r, idx) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      administrativeArea: r.administrativeArea,
      baselineStatus: r.status,
      simulatedStatus:
        idx % 2 === 0 || roadShiftLevel >= 2 ? 'CLOSED' : 'BLOCKED',
      reason:
        config.hazard === 'FLOOD'
          ? `Inundation depth reaches 1.2m across ${r.name}`
          : config.hazard === 'CYCLONE'
            ? `Transmission tower collapse and heavy tree fall obstructs carriage`
            : `Catchment runoff and storm surge debris impassable for light vehicles`,
    }));

  const simulatedRoads: SimulatedRoadStatus = {
    open: createMetricChange(baseOpen, simOpen),
    caution: createMetricChange(baseCaution, simCaution),
    partiallyBlocked: createMetricChange(basePartial, simPartial),
    blocked: createMetricChange(baseBlocked, simBlocked),
    closed: createMetricChange(baseClosed, simClosed),
    affectedSegmentsCount: simBlocked + simClosed + simPartial,
    impactedSegments,
  };

  // ── 8. Simulated Alert Thresholds ───────────────────────────────────────────
  const simulatedAlerts: SimulatedAlertItem[] = [];
  if (simRiskRaw >= 75 || config.intensity === 'EXTREME') {
    simulatedAlerts.push({
      id: 'sim-alert-red-flash',
      title: 'Simulated Scenario Alert: Red Warning Threshold Exceeded',
      severity: 'CRITICAL',
      hazard: config.hazard,
      thresholdReached: `Projected risk score ${simRiskRaw}/100 exceeds Disaster Authority Red Alert threshold (75).`,
      recommendedAction: 'Mandatory evacuation of ground floor residences within 1.5 km of riverbanks / coast.',
    });
  }
  if (config.advanced.windSpeedKmh >= 130) {
    simulatedAlerts.push({
      id: 'sim-alert-gale-surge',
      title: 'Simulated Gale Force & High Wind Advisory',
      severity: 'HIGH',
      hazard: 'CYCLONE',
      thresholdReached: `Peak gusts of ${config.advanced.windSpeedKmh} km/h modelled in coastal sector.`,
      recommendedAction: 'Prohibit all vehicular transit on elevated highway bridges and flyovers.',
    });
  }
  if (config.advanced.rainfallMm24h >= 100 || config.advanced.riverSurgeMeters >= 1.5) {
    simulatedAlerts.push({
      id: 'sim-alert-flood-inundation',
      title: 'Simulated Flash Inundation Warning',
      severity: 'HIGH',
      hazard: 'FLOOD',
      thresholdReached: `Excess runoff (+${config.advanced.rainfallMm24h}mm) and river surge (+${config.advanced.riverSurgeMeters}m) breaches drainage capacity.`,
      recommendedAction: 'Pre-position high-capacity dewatering pumps and deploy inflatable rescue boats.',
    });
  }

  // ── 9. Response Requirements Summary ────────────────────────────────────────
  const waterItem = simulatedResources.find((r) => r.category === 'WATER');
  const foodItem = simulatedResources.find((r) => r.category === 'FOOD');
  const medItem = simulatedResources.find((r) => r.category === 'MEDICAL');
  const rescueItem = simulatedResources.find((r) => r.category === 'RESCUE');
  const vehItem = simulatedResources.find((r) => r.category === 'VEHICLES');
  const boatItem = simulatedResources.find((r) => r.category === 'BOATS');
  const kitItem = simulatedResources.find((r) => r.category === 'KITS');

  const responseRequirements: SimulatedResponseSummary = {
    additionalWater: waterItem?.additionalRequired ?? 3500,
    additionalFood: foodItem?.additionalRequired ?? 2400,
    additionalMedical: medItem?.additionalRequired ?? 450,
    additionalRescueTeams: rescueItem?.additionalRequired ?? 14,
    additionalVehicles: vehItem?.additionalRequired ?? 8,
    additionalBoats: boatItem?.additionalRequired ?? 12,
    additionalShelterBeds: simulatedShelters.projectedCapacityGap,
    additionalEmergencyKits: kitItem?.additionalRequired ?? 1800,
  };

  // ── 10. Simulation Timeline Steps ───────────────────────────────────────────
  const simTimeline: SimulatedTimelineStep[] = [
    {
      stepLabel: 'T+0',
      hourOffset: 0,
      riskScore: baseAvgRisk,
      populationExposed: basePop,
      shelterDemand: baseDemandSum,
      resourceDeficitCount: 2,
      roadPassabilityPct: 82,
      narrative: 'Scenario baseline state: initial atmospheric and hydrological alert parameters initialized.',
    },
    {
      stepLabel: 'T+6h',
      hourOffset: 6,
      riskScore: Math.round(baseAvgRisk + (simRiskRaw - baseAvgRisk) * 0.4),
      populationExposed: Math.round(basePop + (simPop - basePop) * 0.35),
      shelterDemand: Math.round(baseDemandSum + (simDemandSum - baseDemandSum) * 0.3),
      resourceDeficitCount: 3,
      roadPassabilityPct: 70,
      narrative: 'Precipitation and surface runoff intensify; low-lying access corridors begin waterlogging.',
    },
    {
      stepLabel: 'T+12h',
      hourOffset: 12,
      riskScore: Math.round(baseAvgRisk + (simRiskRaw - baseAvgRisk) * 0.75),
      populationExposed: Math.round(basePop + (simPop - basePop) * 0.7),
      shelterDemand: Math.round(baseDemandSum + (simDemandSum - baseDemandSum) * 0.65),
      resourceDeficitCount: 4,
      roadPassabilityPct: 54,
      narrative: 'Peak hazard intensity window: gale winds or catchment discharge peak; shelter intake surges.',
    },
    {
      stepLabel: 'T+24h',
      hourOffset: 24,
      riskScore: simRiskRaw,
      populationExposed: simPop,
      shelterDemand: simDemandSum,
      resourceDeficitCount: 5,
      roadPassabilityPct: 42,
      narrative: 'Cumulative impact threshold reached: maximum infrastructure disruption and supply deficits.',
    },
    {
      stepLabel: 'T+48h',
      hourOffset: 48,
      riskScore: Math.round(simRiskRaw * 0.88),
      populationExposed: Math.round(simPop * 0.92),
      shelterDemand: Math.round(simDemandSum * 0.95),
      resourceDeficitCount: 4,
      roadPassabilityPct: 52,
      narrative: 'Transition to emergency relief and structural clearance; persistent waterlogging in depressions.',
    },
    {
      stepLabel: 'T+72h',
      hourOffset: 72,
      riskScore: Math.round(simRiskRaw * 0.72),
      populationExposed: Math.round(simPop * 0.8),
      shelterDemand: Math.round(simDemandSum * 0.82),
      resourceDeficitCount: 3,
      roadPassabilityPct: 68,
      narrative: 'Progressive road reopening; humanitarian supply pipelines stabilize active relief camps.',
    },
  ];

  // ── 11. Plain-Language Synthesis Narrative ──────────────────────────────────
  const synthesisNarrative = `Under this simulated ${config.intensity.toLowerCase()} intensity ${config.hazard.replace('_', ' ').toLowerCase()} scenario (${config.duration}), composite risk elevates by +${simulatedRisk.composite.delta} points to ${simRiskRaw}/100 in ${targetRegionName}. Additional exposure affects approximately +${formatNumber(simulatedImpact.population.delta)} residents, generating an incremental shelter demand of +${formatNumber(simulatedShelters.demandDelta)} evacuees and creating a net shelter capacity gap of ${formatNumber(simulatedShelters.projectedCapacityGap)} beds. Emergency transit passability is reduced by ${Math.abs(simulatedRoads.open.percentChange)}%, with ${simulatedRoads.blocked.simulated + simulatedRoads.closed.simulated} road segments obstructed. Recommended proactive posture includes pre-staging +${formatNumber(responseRequirements.additionalWater)} water units and ${responseRequirements.additionalRescueTeams} specialized rescue teams.`;

  return {
    scenario: config,
    targetRegionName,
    risk: simulatedRisk,
    impact: simulatedImpact,
    shelters: simulatedShelters,
    resources: simulatedResources,
    roads: simulatedRoads,
    alerts: simulatedAlerts,
    responseRequirements,
    timeline: simTimeline,
    synthesisNarrative,
    generatedAt: new Date().toISOString(),
  };
}
