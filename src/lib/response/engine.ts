/**
 * Response Coordination & Resource Operations — Aggregation Engine
 *
 * Coordinates multi-hazard intelligence across Tasks 2–16 into operational views:
 * WHAT IS NEEDED → WHERE IT IS NEEDED → WHAT IS AVAILABLE → WHAT HAS A GAP
 *
 * Professional emergency operations decision support.
 */

import { aggregateCommandCenterData } from '@/lib/commandCenter/aggregator';
import { demoCitizenReports } from '@/data/demo/citizenReports';
import { demoRoadSegments } from '@/data/demo';
import { demoDataset } from '@/data/demo';
import { formatNumber } from '@/lib/utils';
import type { HazardType, Severity } from '@/types';
import type { ResourceCategory } from '@/lib/planning/resources/types';
import type {
  ResponseCoordinationData,
  OperationalOverviewMetrics,
  ResourceReadinessItem,
  ResourceZoneAllocation,
  ResponseZoneItem,
  ResponsePriorityIndex,
  PriorityFactorContribution,
  ResponseTimelineStep,
  ShelterOperationsData,
  ShelterOperationalItem,
  OperationalStatus,
  ResourceAvailabilityStatus,
} from './types';

// ── Default Operational Workflow Statuses per Zone ───────────────────────────

const INITIAL_ZONE_STATUSES: Record<string, OperationalStatus> = {
  'mh-puri-coast':        'ACTIVE RESPONSE',
  'mh-mahanadi-delta':    'ACTIVE RESPONSE',
  'mh-paradip-port':      'RESOURCE DEPLOYMENT',
  'mh-kendrapara-coast':  'RESPONSE PLANNED',
  'mh-bhubaneswar-urban': 'ASSESSING',
  'mh-visakhapatnam':     'MONITORING',
  'mh-chilika':           'RESPONSE PLANNED',
  'mh-godavari-ap':       'MONITORING',
  'mh-gopalpur-south':    'MONITORING',
};

/**
 * Calculates a transparent, deterministic Response Priority Index (0–100)
 * based strictly on objective operational metrics.
 */
export function calculateResponsePriorityIndex(params: {
  riskScore: number;
  populationExposed: number;
  buildingsAffected: number;
  hospitalsAffected: number;
  roadsAffectedKm: number;
  shelterGap: number;
  resourceGapCount: number;
  roadAccess: 'OPEN' | 'PARTIAL' | 'RESTRICTED';
  activeAlertSeverity: Severity | 'NONE';
}): ResponsePriorityIndex {
  // 1. Hazard Risk (30%)
  const riskRaw = Math.min(100, Math.max(0, params.riskScore));
  const riskContrib = riskRaw * 0.3;

  // 2. Population Exposure (20%) - normalized up to 500,000 residents
  const popRaw = Math.min(100, (params.populationExposed / 500000) * 100);
  const popContrib = popRaw * 0.2;

  // 3. Critical Infrastructure Stress (15%)
  const infraRaw = Math.min(
    100,
    (params.buildingsAffected / 5000) * 40 +
      params.hospitalsAffected * 15 +
      (params.roadsAffectedKm / 50) * 30,
  );
  const infraContrib = infraRaw * 0.15;

  // 4. Shelter Evacuation Deficit (15%)
  const shelterRaw = params.shelterGap > 0 ? Math.min(100, (params.shelterGap / 1200) * 100) : 0;
  const shelterContrib = shelterRaw * 0.15;

  // 5. Relief Supply Line Deficits (10%)
  const resRaw = Math.min(100, params.resourceGapCount * 25);
  const resContrib = resRaw * 0.1;

  // 6. Transport Ingress Impediment (10%)
  const accessRaw =
    params.roadAccess === 'RESTRICTED' ? 100 : params.roadAccess === 'PARTIAL' ? 50 : 0;
  const accessContrib = accessRaw * 0.1;

  const totalScore = Math.round(
    riskContrib + popContrib + infraContrib + shelterContrib + resContrib + accessContrib,
  );
  const clampedScore = Math.min(100, Math.max(0, totalScore));

  let level: ResponsePriorityIndex['level'] = 'LOW';
  if (clampedScore >= 75) level = 'CRITICAL';
  else if (clampedScore >= 55) level = 'HIGH';
  else if (clampedScore >= 35) level = 'MODERATE';

  const factors: PriorityFactorContribution[] = [
    {
      factor: 'Hazard Risk Intensity',
      weight: 30,
      rawScore: Math.round(riskRaw),
      contribution: Math.round(riskContrib),
      explanation: `${params.riskScore}/100 composite risk rating from multi-hazard environmental indicators.`,
    },
    {
      factor: 'Population In Corridor',
      weight: 20,
      rawScore: Math.round(popRaw),
      contribution: Math.round(popContrib),
      explanation: `${formatNumber(params.populationExposed)} residents within immediate hazard exposure zone.`,
    },
    {
      factor: 'Critical Infrastructure Stress',
      weight: 15,
      rawScore: Math.round(infraRaw),
      contribution: Math.round(infraContrib),
      explanation: `${formatNumber(params.buildingsAffected)} structures, ${params.hospitalsAffected} hospitals, and ${params.roadsAffectedKm} km transit corridors exposed.`,
    },
    {
      factor: 'Shelter Evacuation Gap',
      weight: 15,
      rawScore: Math.round(shelterRaw),
      contribution: Math.round(shelterContrib),
      explanation:
        params.shelterGap > 0
          ? `Estimated shortage of ${formatNumber(params.shelterGap)} bed-spaces for projected evacuees.`
          : 'Local shelter capacity currently satisfies projected evacuation needs.',
    },
    {
      factor: 'Resource Stockpile Deficits',
      weight: 10,
      rawScore: Math.round(resRaw),
      contribution: Math.round(resContrib),
      explanation: `${params.resourceGapCount} critical resource categories require inter-district replenishment.`,
    },
    {
      factor: 'Transit Ingress Access',
      weight: 10,
      rawScore: Math.round(accessRaw),
      contribution: Math.round(accessContrib),
      explanation:
        params.roadAccess === 'RESTRICTED'
          ? 'Primary arterial links impassable due to blockages; response mobility constrained.'
          : params.roadAccess === 'PARTIAL'
          ? 'Partial bottlenecks reported; high-clearance assets required.'
          : 'Direct transit access confirmed open without major obstacles.',
    },
  ];

  return {
    score: clampedScore,
    level,
    factors,
  };
}

/**
 * Builds realistic, structured operational timeline steps for a zone.
 */
function buildZoneTimeline(zoneName: string, priorityScore: number): ResponseTimelineStep[] {
  return [
    {
      id: 'step-1',
      step: 'Hazard Alert Broadcast',
      timestamp: 'T-18h · 06:00 IST',
      status: 'COMPLETED',
      details: `Common Alerting Protocol (CAP) severe weather bulletin broadcast for ${zoneName}.`,
    },
    {
      id: 'step-2',
      step: 'Multi-Hazard Risk Synthesis',
      timestamp: 'T-12h · 12:00 IST',
      status: 'COMPLETED',
      details: 'Inundation and cyclone gale envelope calculations completed across district sectors.',
    },
    {
      id: 'step-3',
      step: 'Exposure & Impact Modeling',
      timestamp: 'T-6h · 18:00 IST',
      status: 'COMPLETED',
      details: 'Structural asset exposure and demographic footprint calculated for evacuation sectors.',
    },
    {
      id: 'step-4',
      step: 'Resource & Shelter Triage',
      timestamp: 'T-2h · 22:00 IST',
      status: 'COMPLETED',
      details: 'Local stockpile shortfalls identified; logistics transfer requirements posted.',
    },
    {
      id: 'step-5',
      step: 'Operations Coordination Active',
      timestamp: 'T0 · Active Operational Window',
      status: priorityScore >= 60 ? 'IN_PROGRESS' : 'PENDING',
      details: 'Field teams deployed; real-time ground reports correlated with response assets.',
    },
  ];
}

import type { CommandCenterData } from '@/lib/commandCenter/types';
import type { DemoAlert as Alert, Shelter } from '@/data/types';
import type { CitizenReportItem } from '@/lib/reports/types';
import type { RoadSegment } from '@/lib/roads/types';

import type { AppEnvironment } from '@/lib/env';

/**
 * Builds the complete Response Coordination & Resource Operations dataset.
 * Accepts optional live command center data, overrides, and environment.
 */
export function buildResponseCoordinationData(
  providedCcData?: CommandCenterData,
  overrides?: {
    alerts?: Alert[];
    reports?: CitizenReportItem[];
    roads?: RoadSegment[];
    shelters?: Shelter[];
  },
  environment: AppEnvironment = 'REAL',
): ResponseCoordinationData {
  const isReal = environment === 'REAL';
  const ccData = providedCcData ?? aggregateCommandCenterData({ ...overrides, environment });
  const alerts = overrides?.alerts ?? (isReal ? [] : demoDataset.alerts);
  const activeAlerts = alerts.filter((a) => a.isActive);
  const reports = overrides?.reports ?? (isReal ? [] : demoCitizenReports);
  const roads = overrides?.roads ?? (isReal ? [] : demoRoadSegments);
  const shelters = overrides?.shelters ?? (isReal ? [] : demoDataset.shelters);

  // 1. Build Response Zones (dynamically driven by active operational locations)
  const zones: ResponseZoneItem[] = ccData.priorityLocations.map((loc) => {
    // Map road access to OPEN | PARTIAL | RESTRICTED
    const roadAccess =
      loc.roadAccessibility === 'BLOCKED'
        ? 'RESTRICTED'
        : loc.roadAccessibility === 'PARTIAL'
        ? 'PARTIAL'
        : 'OPEN';

    // Map shelter status
    const shelterStatus: ResponseZoneItem['shelterStatus'] =
      loc.shelterGap > 0 ? 'SHORTAGE' : loc.shelterDemand > loc.shelterCapacity * 0.8 ? 'PRESSURE' : 'AVAILABLE';

    // Correlate resource gaps for this zone
    const resourceGaps: ResponseZoneItem['resourceGaps'] = [];
    if (loc.resourceShortageCount > 0) {
      if (loc.dominantHazard === 'CYCLONE' || loc.dominantHazard === 'MULTI_HAZARD') {
        resourceGaps.push({ category: 'BOATS', name: 'Rescue Boats', gap: 6, unit: 'craft' });
        resourceGaps.push({ category: 'MEDICAL', name: 'Emergency Medical Units', gap: 3, unit: 'teams' });
        resourceGaps.push({ category: 'WATER', name: 'Drinking Water', gap: 2400, unit: 'liters/day' });
      } else {
        resourceGaps.push({ category: 'WATER', name: 'Drinking Water', gap: 1800, unit: 'liters/day' });
        resourceGaps.push({ category: 'FOOD', name: 'Ration Kits', gap: 850, unit: 'packs' });
        resourceGaps.push({ category: 'BOATS', name: 'Inflatable Rafts', gap: 4, unit: 'craft' });
      }
    }

    // Active alert severity
    const localAlerts = activeAlerts.filter(
      (a) =>
        a.regionName.toLowerCase().includes(loc.district.toLowerCase()) ||
        a.title.toLowerCase().includes(loc.district.toLowerCase()),
    );
    let activeAlertSeverity: Severity | 'NONE' = 'NONE';
    if (localAlerts.some((a) => a.severity === 'CRITICAL')) activeAlertSeverity = 'CRITICAL';
    else if (localAlerts.some((a) => a.severity === 'HIGH')) activeAlertSeverity = 'HIGH';
    else if (localAlerts.length > 0) activeAlertSeverity = 'MODERATE';

    // Priority Index calculation
    const priorityIndex = calculateResponsePriorityIndex({
      riskScore: loc.riskScore,
      populationExposed: loc.populationExposed,
      buildingsAffected: loc.impact.buildings,
      hospitalsAffected: loc.impact.hospitals,
      roadsAffectedKm: loc.impact.roadsKm,
      shelterGap: loc.shelterGap,
      resourceGapCount: resourceGaps.length,
      roadAccess,
      activeAlertSeverity,
    });

    const operationalStatus = INITIAL_ZONE_STATUSES[loc.id] ?? 'ASSESSING';
    const timeline = buildZoneTimeline(loc.name, priorityIndex.score);

    return {
      id: loc.id,
      name: loc.name,
      district: loc.district,
      coordinates: loc.coordinates,
      riskScore: loc.riskScore,
      dominantHazard: loc.dominantHazard,
      populationExposed: loc.populationExposed,
      impactEstimate: loc.impact,
      activeAlertCount: localAlerts.length,
      activeAlertSeverity,
      roadAccess,
      shelterCapacity: loc.shelterCapacity,
      shelterOccupancy: Math.round(loc.shelterCapacity * 0.78),
      shelterDemand: loc.shelterDemand,
      shelterGap: loc.shelterGap,
      shelterStatus,
      resourceGaps,
      totalResourceGapCount: resourceGaps.length,
      fieldReportsCount: loc.groundReportsCount,
      verifiedReportsCount: Math.round(loc.groundReportsCount * 0.6),
      evidenceReportsCount: loc.evidenceReportsCount,
      priorityIndex,
      operationalStatus,
      timeline,
    };
  });

  // Sort zones by Response Priority Index descending
  zones.sort((a, b) => b.priorityIndex.score - a.priorityIndex.score);

  // 2. Build Resource Readiness & Allocation Items (empty in real mode until resources are requisitioned)
  const rawResourceList: {
    id: string;
    category: ResourceCategory;
    name: string;
    icon: string;
    unit: string;
    required: number;
    available: number;
    status: ResourceAvailabilityStatus;
  }[] = isReal ? [] : [
    {
      id: 'res-water',
      category: 'WATER',
      name: 'Drinking Water Supply',
      icon: '💧',
      unit: 'liters/day',
      required: 18500,
      available: 13200,
      status: 'SHORTAGE',
    },
    {
      id: 'res-food',
      category: 'FOOD',
      name: 'Emergency Food Supplies',
      icon: '🍞',
      unit: 'meal packs',
      required: 14200,
      available: 12100,
      status: 'LIMITED',
    },
    {
      id: 'res-medical',
      category: 'MEDICAL',
      name: 'Medical Supplies & Trauma Kits',
      icon: '🏥',
      unit: 'aid units',
      required: 24,
      available: 16,
      status: 'SHORTAGE',
    },
    {
      id: 'res-rescue',
      category: 'RESCUE',
      name: 'Specialist Rescue Teams',
      icon: '🦺',
      unit: 'teams',
      required: 18,
      available: 15,
      status: 'LIMITED',
    },
    {
      id: 'res-vehicles',
      category: 'VEHICLES',
      name: 'Emergency Transport & 4x4s',
      icon: '🚚',
      unit: 'vehicles',
      required: 35,
      available: 30,
      status: 'AVAILABLE',
    },
    {
      id: 'res-boats',
      category: 'BOATS',
      name: 'Inflatable Rescue Boats',
      icon: '🚤',
      unit: 'craft',
      required: 42,
      available: 28,
      status: 'SHORTAGE',
    },
    {
      id: 'res-kits',
      category: 'KITS',
      name: 'Emergency Survival Kits',
      icon: '📦',
      unit: 'family packs',
      required: 8500,
      available: 7200,
      status: 'AVAILABLE',
    },
    {
      id: 'res-shelter',
      category: 'SHELTER',
      name: 'Temporary Shelter Supplies',
      icon: '⛺',
      unit: 'slots',
      required: 6400,
      available: 4800,
      status: 'LIMITED',
    },
  ];

  const resources: ResourceReadinessItem[] = rawResourceList.map((r) => {
    const gap = Math.max(0, r.required - r.available);
    const coveragePct = r.required > 0 ? Math.round((r.available / r.required) * 100) : 100;

    // Distribute allocations across affected zones
    const affectedZones: ResourceZoneAllocation[] = zones.slice(0, 4).map((zone, idx) => {
      const zoneReq = Math.round(r.required * (idx === 0 ? 0.45 : idx === 1 ? 0.3 : 0.15));
      const zoneAvail = Math.round(r.available * (idx === 0 ? 0.4 : idx === 1 ? 0.35 : 0.15));
      const zoneGap = Math.max(0, zoneReq - zoneAvail);
      const zoneCoverage = zoneReq > 0 ? Math.round((zoneAvail / zoneReq) * 100) : 100;

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        district: zone.district,
        required: zoneReq,
        available: zoneAvail,
        gap: zoneGap,
        coveragePct: zoneCoverage,
        priorityLevel: zone.priorityIndex.level,
        operationalStatus: zone.operationalStatus,
      };
    });

    return {
      id: r.id,
      category: r.category,
      name: r.name,
      icon: r.icon,
      unit: r.unit,
      required: r.required,
      available: r.available,
      gap,
      coveragePct,
      status: r.status,
      affectedZones,
    };
  });

  // 3. Build Shelter Operations
  const shelterItems: ShelterOperationalItem[] = shelters.map((s) => {
    const projectedDemand = Math.round(
      s.capacity * (s.status === 'FULL' ? 1.25 : s.status === 'PREPARING' ? 0.9 : 0.85),
    );
    const availableCapacity = Math.max(0, s.capacity - s.occupancy);
    const gap = Math.max(0, projectedDemand - s.capacity);
    const status: ShelterOperationalItem['status'] =
      gap > 0 ? 'SHORTAGE' : s.occupancy / Math.max(1, s.capacity) >= 0.8 ? 'PRESSURE' : 'AVAILABLE';

    return {
      id: s.id,
      name: s.name,
      district: s.address.split(',').pop()?.trim() || 'Odisha Sector',
      capacity: s.capacity,
      currentOccupancy: s.occupancy,
      projectedDemand,
      availableCapacity,
      gap,
      status,
      hasMedical: s.hasMedical,
      hasFood: s.hasFood,
    };
  });

  const totalCapacity = shelterItems.reduce((acc, s) => acc + s.capacity, 0);
  const totalOccupancy = shelterItems.reduce((acc, s) => acc + s.currentOccupancy, 0);
  const totalAvailableCapacity = Math.max(0, totalCapacity - totalOccupancy);
  const totalDemand = shelterItems.reduce((acc, s) => acc + s.projectedDemand, 0);
  const totalCapacityGap = shelterItems.reduce((acc, s) => acc + s.gap, 0);

  const shelterOperations: ShelterOperationsData = {
    totalShelters: shelters.length,
    availableCapacity: totalAvailableCapacity,
    projectedDemand: totalDemand,
    capacityGap: totalCapacityGap,
    highPressureShelters: shelterItems.filter((s) => s.status === 'PRESSURE' || s.status === 'SHORTAGE')
      .length,
    shortageAreasCount: shelterItems.filter((s) => s.status === 'SHORTAGE').length,
    shelters: shelterItems,
  };

  // 4. Operational Overview Metrics
  const activeIncidents = ccData.overview.activeDisasters.length;
  const highPriorityAreas = zones.filter(
    (z) => z.priorityIndex.level === 'CRITICAL' || z.priorityIndex.level === 'HIGH',
  ).length;
  const resourceShortages = resources.filter((r) => r.status === 'SHORTAGE').length;
  const shelterPressure = shelterOperations.highPressureShelters;
  const roadBlockages = roads.filter((r) => r.status === 'BLOCKED' || r.status === 'CLOSED').length;
  const pendingFieldReports = reports.filter((r) => r.status === 'PENDING').length;

  const overview: OperationalOverviewMetrics = {
    activeIncidents,
    highPriorityAreas,
    resourceShortages,
    shelterPressure,
    roadBlockages,
    pendingFieldReports,
  };

  return {
    overview,
    resources,
    zones,
    shelters: shelterOperations,
  };
}
