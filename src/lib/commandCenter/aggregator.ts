/**
 * Emergency Operations Command Center — Intelligence Aggregator
 *
 * ⚠️ PROTOTYPE / DECISION SUPPORT ONLY
 * Aggregates intelligence across Tasks 2–15:
 *   SITUATION → RISK → IMPACT → RESOURCES → ALERTS → GROUND REPORTS → RESPONSE
 *
 * Deterministic aggregation without duplicating underlying datasets or engines.
 */

import { computedMultiHazardRisks } from '@/data/demo/computedMultiHazardRisks';
import { computedFloodRisks } from '@/data/demo/computedFloodRisks';
import { computedCycloneRisks } from '@/data/demo/computedCycloneRisks';
import { demoDataset } from '@/data/demo';
import { demoCitizenReports } from '@/data/demo/citizenReports';
import { demoHistoricalEvents } from '@/data/demo/historicalEvents';
import { demoRoadSegments } from '@/data/demo';
import { calculateImpact, DEMO_ZONE_EXPOSURE, fallbackExposure } from '@/lib/impact';
import { buildShelterPlanningForZone } from '@/lib/planning/shelter';
import { buildResourcePlanningForZone } from '@/lib/planning/resources';
import type { ResourceRequirementItem } from '@/lib/planning/resources/types';
import { getAvailableRealRegions } from '@/lib/geo';
import { formatNumber } from '@/lib/utils';
import { calculateFloodRisk } from '@/lib/risk/flood';
import { calculateCycloneRisk } from '@/lib/risk/cyclone';
import { getAllCachedWeather } from '@/lib/weather/store';
import type { HazardType, Severity, ReportStatus } from '@/types';
import type { RoadStatus, RoadSegment } from '@/lib/roads/types';
import type { DemoAlert as Alert, Shelter } from '@/data/types';
import type { CitizenReportItem } from '@/lib/reports/types';
import type {
  CommandCenterData,
  PriorityLocation,
  RiskKpis,
  ImpactKpis,
  ResponseKpis,
  OperationalSummaryNarrative,
  HazardBreakdownItem,
  SituationTimelinePoint,
  CitizenReportsIntelligence,
  RoadOperationsSummary,
  ShelterOperationsSummary,
  ShelterOperationsSummaryItem,
  ResourceOperationsSummary,
  ResourceOperationsItem,
  OperationsFilters,
} from './types';

// ── Canonical Location Metadata ──────────────────────────────────────────────

interface LocationMeta {
  id: string;
  name: string;
  district: string;
  coordinates: [number, number];
  floodKey?: string;
  cycloneKey?: string;
  population: number;
}

const LOCATION_METAS: LocationMeta[] = [
  {
    id: 'mh-puri-coast',
    name: 'Puri Coastal Belt & Town',
    district: 'Puri District',
    coordinates: [85.8315, 19.8005],
    floodKey: 'rz-puri-coast',
    cycloneKey: 'crz-puri-landfall',
    population: 340000,
  },
  {
    id: 'mh-mahanadi-delta',
    name: 'Mahanadi Delta & Cuttack Lowlands',
    district: 'Cuttack District',
    coordinates: [85.8830, 20.4812],
    floodKey: 'rz-mahanadi-delta',
    population: 410000,
  },
  {
    id: 'mh-bhubaneswar-urban',
    name: 'Bhubaneswar Capital Metropolitan',
    district: 'Khurda District',
    coordinates: [85.8245, 20.2756],
    floodKey: 'rz-bhubaneswar-urban',
    population: 920000,
  },
  {
    id: 'mh-paradip-port',
    name: 'Paradip Port & Industrial Hub',
    district: 'Jagatsinghpur District',
    coordinates: [86.6111, 20.2644],
    cycloneKey: 'crz-paradip-port',
    population: 210000,
  },
  {
    id: 'mh-kendrapara-coast',
    name: 'Kendrapara Estuarine Coastline',
    district: 'Kendrapara District',
    coordinates: [86.4214, 20.5012],
    cycloneKey: 'crz-kendrapara-coast',
    population: 160000,
  },
  {
    id: 'mh-visakhapatnam',
    name: 'Visakhapatnam Urban & Port Complex',
    district: 'Visakhapatnam District',
    coordinates: [83.2966, 17.7210],
    floodKey: 'rz-visakha-hills',
    cycloneKey: 'crz-visakha-cyclone',
    population: 580000,
  },
  {
    id: 'mh-godavari-ap',
    name: 'Godavari Lower Floodplain (AP)',
    district: 'East Godavari District',
    coordinates: [81.7820, 16.9891],
    floodKey: 'rz-godavari-ap',
    population: 340000,
  },
  {
    id: 'mh-chilika',
    name: 'Chilika Lake & Barrier Islands',
    district: 'Puri / Ganjam Districts',
    coordinates: [85.3400, 19.6800],
    floodKey: 'rz-chilika-south',
    cycloneKey: 'crz-chilika-surge',
    population: 95000,
  },
  {
    id: 'mh-gopalpur-south',
    name: 'Gopalpur Coastal Enclave',
    district: 'Ganjam District',
    coordinates: [84.9080, 19.2610],
    cycloneKey: 'crz-gopalpur-south',
    population: 88000,
  },
];

export interface CommandCenterDataOverrides {
  alerts?: Alert[];
  reports?: CitizenReportItem[];
  roads?: RoadSegment[];
  shelters?: Shelter[];
  shelterOccupancies?: Record<string, number>;
  resourceStocks?: Record<string, number>;
  riverGaugeDeltas?: Record<string, number>;
  rainfallDeltas?: Record<string, number>;
  environment?: 'REAL' | 'DEMO';
}

/**
 * Builds the complete unified command center intelligence dataset.
 * Supports dynamic live data overrides without modifying baseline sources.
 */
export function aggregateCommandCenterData(overrides?: CommandCenterDataOverrides): CommandCenterData {
  const isReal = overrides?.environment === 'REAL';
  const alerts = overrides?.alerts ?? (isReal ? [] : demoDataset.alerts);
  const activeAlerts = alerts.filter((a) => a.isActive);
  const reports = overrides?.reports ?? (isReal ? [] : demoCitizenReports);
  const roads = overrides?.roads ?? (isReal ? [] : demoRoadSegments);
  const rawShelters = overrides?.shelters ?? (isReal ? [] : demoDataset.shelters);
  const shelters = overrides?.shelterOccupancies
    ? rawShelters.map((s) => {
        const occ = overrides.shelterOccupancies![s.id];
        return typeof occ === 'number'
          ? { ...s, occupancy: occ, status: occ >= s.capacity ? ('FULL' as const) : ('OPEN' as const) }
          : s;
      })
    : rawShelters;

  // 1. Build priority locations by joining Risk + Impact + Shelter + Resources + Roads
  let priorityLocations: PriorityLocation[];

  if (isReal) {
    const realRegions = getAvailableRealRegions();
    const cachedWeatherList = getAllCachedWeather();

    priorityLocations = realRegions.map((region) => {
      const localAlerts = activeAlerts.filter(
        (a) =>
          a.regionName.toLowerCase().includes(region.district.toLowerCase()) ||
          a.title.toLowerCase().includes(region.district.toLowerCase()),
      );
      const localReports = reports.filter(
        (r) =>
          r.administrativeArea.toLowerCase().includes(region.district.toLowerCase()) ||
          r.address.toLowerCase().includes(region.district.toLowerCase()),
      );
      const localRoads = roads.filter(
        (rd) =>
          (rd.administrativeArea && rd.administrativeArea.toLowerCase().includes(region.district.toLowerCase())) ||
          rd.name.toLowerCase().includes(region.district.toLowerCase()),
      );

      // Match real weather observation if available
      const matchingWeather = cachedWeatherList.find(
        (w) =>
          (region.district && w.district && w.district.toLowerCase().includes(region.district.toLowerCase())) ||
          (region.displayName && w.locationName && w.locationName.toLowerCase().includes(region.displayName.toLowerCase())) ||
          (region.coordinates &&
            Math.hypot(w.coordinates[0] - region.coordinates[0], w.coordinates[1] - region.coordinates[1]) < 0.6),
      );

      let floodScore = 0;
      let cycloneScore = 0;
      let weatherRiskScore = 0;
      let dominantHazard: HazardType | 'MULTI_HAZARD' = 'MULTI_HAZARD';

      if (matchingWeather) {
        const precip24h = Math.max(0, matchingWeather.precipitationMm * 24);
        const riverSurgeProxy = Math.max(-1.0, (matchingWeather.precipitationMm - 4) * 0.2);
        const floodRes = calculateFloodRisk(
          {
            rainfallIntensityMmPerDay: precip24h,
            riverLevelMetres: riverSurgeProxy,
            elevationMetres: 18,
            distanceFromRiverKm: 3.0,
            exposedPopulation: 35000,
            historicalFloodFrequency: 1.5,
            infrastructureVulnerabilityIndex: 0.35,
          },
          true,
        );
        floodScore = floodRes.score;

        const pressureDropSurge = Math.max(0, (1013 - matchingWeather.surfacePressureHpa) * 0.04);
        const cycloneRes = calculateCycloneRisk(
          {
            windSpeedKmh: matchingWeather.windSpeedKmh,
            rainfallMmPerDay: precip24h,
            stormSurgeMetres: pressureDropSurge,
            distanceFromTrackKm: 45,
            exposedPopulation: 45000,
            elevationMetres: 18,
            historicalCycloneFrequency: 1.2,
            infrastructureVulnerabilityIndex: 0.35,
          },
          true,
        );
        cycloneScore = cycloneRes.score;

        if (cycloneScore > floodScore && cycloneScore >= 20) {
          dominantHazard = 'CYCLONE';
        } else if (floodScore > cycloneScore && floodScore >= 20) {
          dominantHazard = 'FLOOD';
        }

        weatherRiskScore = Math.max(floodScore, cycloneScore);
      }

      const hasActivity = localAlerts.length > 0 || localReports.length > 0 || localRoads.length > 0;
      const activityScore = hasActivity ? Math.min(100, 30 + localReports.length * 15 + localAlerts.length * 20) : 0;
      const riskScore = Math.max(activityScore, weatherRiskScore);
      const severity: Severity = riskScore >= 80 ? 'CRITICAL' : riskScore >= 65 ? 'HIGH' : riskScore >= 45 ? 'MODERATE' : 'LOW';

      return {
        id: region.id,
        name: region.displayName,
        district: region.district,
        coordinates: region.coordinates || [85.0, 20.0],
        riskScore,
        severity,
        dominantHazard,
        populationExposed: 0,
        floodRiskScore: floodScore,
        cycloneRiskScore: cycloneScore,
        activeAlertCount: localAlerts.length,
        activeAlertStatus: localAlerts.length > 0 ? (localAlerts.some((a) => a.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH') : 'CLEAR',
        roadAccessibility: localRoads.some((r) => r.status === 'BLOCKED' || r.status === 'CLOSED') ? 'BLOCKED' : 'OPEN',
        shelterStatus: 'SUFFICIENT',
        shelterCapacity: 0,
        shelterDemand: 0,
        shelterGap: 0,
        shelterPressureLabel: 'Normal',
        resourceShortageCount: 0,
        resourceGapSummary: 'Normal',
        rankScore: riskScore,
        impact: {
          buildings: 0,
          roadsKm: 0,
          hospitals: 0,
          schools: 0,
        },
        groundReportsCount: localReports.length,
        evidenceReportsCount: localReports.filter((r) => r.evidence && r.evidence.length > 0).length,
      };
    });
  } else {
    priorityLocations = LOCATION_METAS.map((meta) => {
      const mhResult = computedMultiHazardRisks[meta.id];
      let riskScore = mhResult ? mhResult.result.score : 65;

    // Apply live hydromet / gauge surges if present
    if (overrides?.riverGaugeDeltas?.[meta.id]) {
      const surgeDelta = Math.round(overrides.riverGaugeDeltas[meta.id] * 12);
      riskScore = Math.min(100, Math.max(0, riskScore + surgeDelta));
    }

    const severity: Severity =
      riskScore >= 80 ? 'CRITICAL' : riskScore >= 65 ? 'HIGH' : riskScore >= 45 ? 'MODERATE' : 'LOW';
    const primaryHazard: HazardType = mhResult ? mhResult.result.dominantHazard : meta.cycloneKey ? 'CYCLONE' : 'FLOOD';
    const dominantHazard: HazardType | 'MULTI_HAZARD' = (meta.cycloneKey && meta.floodKey) ? 'MULTI_HAZARD' : primaryHazard;

    const floodExpl = meta.floodKey ? computedFloodRisks[meta.floodKey] : undefined;
    const cycloneExpl = meta.cycloneKey ? computedCycloneRisks[meta.cycloneKey] : undefined;
    const floodRiskScore = floodExpl?.result.score;
    const cycloneRiskScore = cycloneExpl?.result.score;

    // Impact
    const exposure = DEMO_ZONE_EXPOSURE[meta.id] ?? fallbackExposure(meta.population);
    const impactRes = calculateImpact(meta.id, meta.name, {
      riskScore,
      severity,
      dominantHazard: primaryHazard,
      exposure,
    });

    // Shelter Planning
    const shelterPlanning = buildShelterPlanningForZone({
      zoneId: meta.id,
      zoneName: meta.name,
      affectedPopulation: meta.population,
      severity,
      riskScore,
      allShelters: shelters,
      allHistoricalEvents: demoHistoricalEvents,
    });

    // Resource Planning
    const resourcePlanning = buildResourcePlanningForZone({
      zoneId: meta.id,
      zoneName: meta.name,
      affectedPopulation: meta.population,
      severity,
      riskScore,
      dominantHazard: primaryHazard,
      impactResult: impactRes,
      shelterPlanning,
      historicalEvents: demoHistoricalEvents,
    });

    // Correlate active alerts
    const localAlerts = activeAlerts.filter(
      (a) =>
        a.regionName.toLowerCase().includes(meta.district.toLowerCase()) ||
        a.title.toLowerCase().includes(meta.district.toLowerCase()) ||
        (Math.abs(a.coordinates[0] - meta.coordinates[0]) < 0.5 &&
          Math.abs(a.coordinates[1] - meta.coordinates[1]) < 0.5),
    );

    let activeAlertStatus: PriorityLocation['activeAlertStatus'] = 'CLEAR';
    if (localAlerts.some((a) => a.severity === 'CRITICAL')) {
      activeAlertStatus = 'CRITICAL';
    } else if (localAlerts.some((a) => a.severity === 'HIGH')) {
      activeAlertStatus = 'HIGH';
    } else if (localAlerts.length > 0) {
      activeAlertStatus = 'MODERATE';
    }

    // Correlate roads
    const localRoads = roads.filter((r) => {
      const matchDistrict =
        r.name.toLowerCase().includes(meta.district.toLowerCase()) ||
        meta.name.toLowerCase().includes(r.name.toLowerCase());
      const distStart =
        Math.hypot(r.coordinates[0][0] - meta.coordinates[0], r.coordinates[0][1] - meta.coordinates[1]);
      return matchDistrict || distStart < 0.45;
    });

    let roadAccessibility: PriorityLocation['roadAccessibility'] = 'OPEN';
    if (localRoads.some((r) => r.status === 'BLOCKED' || r.status === 'CLOSED')) {
      roadAccessibility = 'BLOCKED';
    } else if (localRoads.some((r) => r.status === 'PARTIALLY_BLOCKED' || r.status === 'CAUTION')) {
      roadAccessibility = 'PARTIAL';
    }

    // Correlate citizen reports
    const localReports = reports.filter((r) => {
      const matchDistrict =
        r.administrativeArea.toLowerCase().includes(meta.district.toLowerCase()) ||
        r.address.toLowerCase().includes(meta.district.toLowerCase());
      const dist = Math.hypot(r.coordinates[0] - meta.coordinates[0], r.coordinates[1] - meta.coordinates[1]);
      return matchDistrict || dist < 0.35;
    });
    const evidenceReports = localReports.filter((r) => r.evidence && r.evidence.length > 0);

    // Shelter pressure string
    const gap = shelterPlanning.capacityGap > 0 ? shelterPlanning.capacityGap : 0;
    const surplus = Math.max(0, -shelterPlanning.capacityGap);

    let shelterPressureLabel = 'AVAILABLE';
    if (gap > 0) {
      shelterPressureLabel = `SHORTAGE (-${formatNumber(gap)})`;
    } else if (shelterPlanning.projectedDemand > shelterPlanning.totalCapacity * 0.8) {
      const pct = Math.round((shelterPlanning.projectedDemand / Math.max(1, shelterPlanning.totalCapacity)) * 100);
      shelterPressureLabel = `PRESSURE (${pct}%)`;
    } else {
      shelterPressureLabel = `AVAILABLE (+${formatNumber(surplus)})`;
    }

    // Resource shortages
    const deficitItems = resourcePlanning.resources.filter(
      (req: ResourceRequirementItem) => req.status === 'SHORTAGE' || req.status === 'CRITICAL_SHORTAGE',
    );
    const resourceShortageCount = deficitItems.length;
    const resourceGapSummary =
      resourceShortageCount > 0
        ? `${resourceShortageCount} Deficits (${deficitItems.slice(0, 2).map((d: ResourceRequirementItem) => d.name).join(', ')})`
        : 'Sufficient';

    // Deterministic Operational Rank Score
    const rankScore =
      riskScore * 0.4 +
      (Math.min(meta.population, 500000) / 10000) * 0.25 +
      resourceShortageCount * 5 +
      (roadAccessibility === 'BLOCKED' ? 25 : roadAccessibility === 'PARTIAL' ? 12 : 0) +
      (gap > 0 ? 20 : 0) +
      localAlerts.length * 3;

    return {
      id: meta.id,
      name: meta.name,
      district: meta.district,
      coordinates: meta.coordinates,
      riskScore,
      severity,
      dominantHazard,
      populationExposed: meta.population,
      floodRiskScore,
      cycloneRiskScore,
      activeAlertCount: localAlerts.length,
      activeAlertStatus,
      roadAccessibility,
      shelterStatus: shelterPlanning.status,
      shelterCapacity: shelterPlanning.totalCapacity,
      shelterDemand: shelterPlanning.projectedDemand,
      shelterGap: gap,
      shelterPressureLabel,
      resourceShortageCount,
      resourceGapSummary,
      rankScore,
      impact: {
        buildings: impactRes.buildings.value,
        roadsKm: impactRes.roads.value,
        hospitals: impactRes.hospitals.value,
        schools: impactRes.schools.value,
      },
      groundReportsCount: localReports.length,
      evidenceReportsCount: evidenceReports.length,
    };
  });
}

  // Sort descending by rank score
  priorityLocations.sort((a, b) => b.rankScore - a.rankScore);

  // 2. Compute Aggregated KPIs
  const highestLocation = priorityLocations[0];

  const riskKpis: RiskKpis = {
    highestCurrentRisk: {
      score: highestLocation ? highestLocation.riskScore : (isReal ? 0 : 88),
      zoneName: highestLocation ? highestLocation.name : (isReal ? 'None (Operational Feeds Standby)' : 'Puri Coastal Belt'),
      dominantHazard: highestLocation ? highestLocation.dominantHazard : 'MULTI_HAZARD',
      severity: highestLocation ? highestLocation.severity : (isReal ? 'LOW' : 'CRITICAL'),
    },
    highRiskLocationsCount: priorityLocations.filter((l) => l.severity === 'CRITICAL' || l.severity === 'HIGH').length,
    floodRiskLocationsCount: priorityLocations.filter((l) => (l.floodRiskScore ?? 0) >= 40).length,
    cycloneRiskLocationsCount: priorityLocations.filter((l) => (l.cycloneRiskScore ?? 0) >= 40).length,
    multiHazardLocationsCount: priorityLocations.filter((l) => Boolean(l.floodRiskScore && l.cycloneRiskScore)).length,
  };

  const impactKpis: ImpactKpis = {
    populationExposed: priorityLocations.reduce((sum, l) => sum + l.populationExposed, 0),
    estimatedBuildingsAffected: priorityLocations.reduce((sum, l) => sum + l.impact.buildings, 0),
    affectedRoadsKm: priorityLocations.reduce((sum, l) => sum + l.impact.roadsKm, 0),
    affectedHospitals: priorityLocations.reduce((sum, l) => sum + l.impact.hospitals, 0),
    affectedSchools: priorityLocations.reduce((sum, l) => sum + l.impact.schools, 0),
  };

  const blockedRoadsCount = roads.filter((r) => r.status === 'BLOCKED' || r.status === 'CLOSED').length;
  const verifiedCitizenReportsCount = reports.filter((r) => r.status === 'VERIFIED').length;
  const sheltersUnderPressureCount = shelters.filter(
    (s) => s.status === 'FULL' || s.occupancy / Math.max(1, s.capacity) >= 0.8,
  ).length;

  // Resource shortages across all locations
  const totalResourceDeficits = priorityLocations.reduce((sum, l) => sum + l.resourceShortageCount, 0);

  const responseKpis: ResponseKpis = {
    activeAlertsCount: activeAlerts.length,
    verifiedCitizenReportsCount,
    blockedRoadsCount,
    sheltersUnderPressureCount,
    resourceShortagesCount: Math.min(12, totalResourceDeficits),
  };

  // 3. Citizen Ground Intelligence Breakdown
  const citizenIntelligence: CitizenReportsIntelligence = {
    totalReports: reports.length,
    pendingReports: reports.filter((r) => r.status === 'PENDING').length,
    underReviewReports: reports.filter((r) => r.status === 'UNDER_REVIEW' || r.status === 'COMMUNITY_CONFIRMED').length,
    verifiedReports: verifiedCitizenReportsCount,
    rejectedReports: reports.filter((r) => r.status === 'REJECTED').length,
    escalatedReports: reports.filter((r) => r.status === 'ESCALATED').length,
    evidenceBackedReports: reports.filter((r) => r.evidence && r.evidence.length > 0).length,
    recentHighImpactReports: [...reports]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6),
  };

  // 4. Blocked Road Operations Breakdown
  const roadOperations: RoadOperationsSummary = {
    blockedCount: roads.filter((r) => r.status === 'BLOCKED').length,
    partiallyBlockedCount: roads.filter((r) => r.status === 'PARTIALLY_BLOCKED').length,
    closedCount: roads.filter((r) => r.status === 'CLOSED').length,
    cautionCount: roads.filter((r) => r.status === 'CAUTION').length,
    openCount: roads.filter((r) => r.status === 'OPEN').length,
    unknownCount: roads.filter((r) => r.status === 'UNKNOWN').length,
    totalDisruptions: roads.filter(
      (r) => r.status === 'BLOCKED' || r.status === 'CLOSED' || r.status === 'PARTIALLY_BLOCKED',
    ).length,
    criticalSegments: roads.filter(
      (r) => r.status === 'BLOCKED' || r.status === 'CLOSED' || r.status === 'PARTIALLY_BLOCKED',
    ),
  };

  // 5. Shelter Operations Breakdown
  const shelterItems: ShelterOperationsSummaryItem[] = shelters.map((s) => {
    // Determine projected demand using simple factor from occupancy & status
    const projectedDemand = Math.round(s.capacity * (s.status === 'FULL' ? 1.25 : s.status === 'PREPARING' ? 0.9 : 0.85));
    const gapOrSurplus = s.capacity - projectedDemand;
    const utilizationPct = s.capacity > 0 ? Math.round((s.occupancy / s.capacity) * 100) : 0;
    const status: ShelterOperationsSummaryItem['status'] =
      gapOrSurplus < 0 ? 'SHORTAGE' : utilizationPct >= 80 ? 'PRESSURE' : 'AVAILABLE';

    return {
      id: s.id,
      name: s.name,
      location: s.address,
      capacity: s.capacity,
      occupancy: s.occupancy,
      projectedDemand,
      gapOrSurplus,
      utilizationPct,
      status,
      hasMedical: s.hasMedical,
      hasFood: s.hasFood,
    };
  });

  const totalCapacityGap = shelterItems.reduce((acc, s) => acc + (s.gapOrSurplus < 0 ? Math.abs(s.gapOrSurplus) : 0), 0);
  const totalProjectedSurplus = shelterItems.reduce(
    (acc, s) => acc + (s.gapOrSurplus > 0 ? s.gapOrSurplus : 0),
    0,
  );

  const shelterOperations: ShelterOperationsSummary = {
    totalShelters: shelters.length,
    availableShelters: shelters.filter((s) => s.status === 'OPEN').length,
    highUtilizationShelters: shelterItems.filter((s) => s.status === 'PRESSURE' || s.status === 'SHORTAGE').length,
    totalCapacityGap,
    totalProjectedDemand: shelterItems.reduce((acc, s) => acc + s.projectedDemand, 0),
    totalProjectedSurplus,
    items: shelterItems,
  };

  // 6. Resource Operations Breakdown (Aggregated Categories)
  const resourceCategories: ResourceOperationsItem[] = isReal
    ? []
    : [
        {
          id: 'res-water',
          category: 'WATER',
          name: 'Drinking Water Supply',
          icon: '💧',
          required: 18500,
          available: 13200 + (overrides?.resourceStocks?.['WATER'] || 0),
          gap: Math.max(0, 18500 - (13200 + (overrides?.resourceStocks?.['WATER'] || 0))),
          coveragePct: Math.min(100, Math.round(((13200 + (overrides?.resourceStocks?.['WATER'] || 0)) / 18500) * 100)),
          status: (18500 - (13200 + (overrides?.resourceStocks?.['WATER'] || 0))) > 2000 ? 'SHORTAGE' : 'ADEQUATE',
          unit: 'liters/day',
        },
        {
          id: 'res-food',
          category: 'FOOD',
          name: 'Ration Kits & Ready Meals',
          icon: '🍞',
          required: 14200,
          available: 12100 + (overrides?.resourceStocks?.['FOOD'] || 0),
          gap: Math.max(0, 14200 - (12100 + (overrides?.resourceStocks?.['FOOD'] || 0))),
          coveragePct: Math.min(100, Math.round(((12100 + (overrides?.resourceStocks?.['FOOD'] || 0)) / 14200) * 100)),
          status: (14200 - (12100 + (overrides?.resourceStocks?.['FOOD'] || 0))) > 1500 ? 'SHORTAGE' : 'ADEQUATE',
          unit: 'meal packs',
        },
        {
          id: 'res-medical',
          category: 'MEDICAL',
          name: 'Emergency Medical Units & First Aid',
          icon: '🏥',
          required: 24,
          available: 16 + (overrides?.resourceStocks?.['MEDICAL'] || 0),
          gap: Math.max(0, 24 - (16 + (overrides?.resourceStocks?.['MEDICAL'] || 0))),
          coveragePct: Math.min(100, Math.round(((16 + (overrides?.resourceStocks?.['MEDICAL'] || 0)) / 24) * 100)),
          status: (24 - (16 + (overrides?.resourceStocks?.['MEDICAL'] || 0))) > 4 ? 'CRITICAL' : 'SHORTAGE',
          unit: 'mobile teams',
        },
        {
          id: 'res-rescue',
          category: 'RESCUE',
          name: 'NDRF / ODRAF Rescue Teams',
          icon: '🦺',
          required: 18,
          available: 15 + (overrides?.resourceStocks?.['RESCUE'] || 0),
          gap: Math.max(0, 18 - (15 + (overrides?.resourceStocks?.['RESCUE'] || 0))),
          coveragePct: Math.min(100, Math.round(((15 + (overrides?.resourceStocks?.['RESCUE'] || 0)) / 18) * 100)),
          status: 'ADEQUATE',
          unit: 'specialist units',
        },
        {
          id: 'res-boats',
          category: 'BOATS',
          name: 'Inflatable Boats & Flood Rafts',
          icon: '🚤',
          required: 42,
          available: 28 + (overrides?.resourceStocks?.['BOATS'] || 0),
          gap: Math.max(0, 42 - (28 + (overrides?.resourceStocks?.['BOATS'] || 0))),
          coveragePct: Math.min(100, Math.round(((28 + (overrides?.resourceStocks?.['BOATS'] || 0)) / 42) * 100)),
          status: (42 - (28 + (overrides?.resourceStocks?.['BOATS'] || 0))) > 5 ? 'SHORTAGE' : 'ADEQUATE',
          unit: 'motor craft',
        },
        {
          id: 'res-vehicles',
          category: 'VEHICLES',
          name: 'High-Clearance 4x4 & Ambulances',
          icon: '🚚',
          required: 35,
          available: 30,
          gap: 5,
          coveragePct: 86,
          status: 'ADEQUATE',
          unit: 'vehicles',
        },
        {
          id: 'res-kits',
          category: 'KITS',
          name: 'Emergency Family Survival Kits',
          icon: '📦',
          required: 8500,
          available: 7200,
          gap: 1300,
          coveragePct: 85,
          status: 'ADEQUATE',
          unit: 'family kits',
        },
        {
          id: 'res-shelter',
          category: 'SHELTER',
          name: 'Emergency Temporary Tents & Tarpaulins',
          icon: '⛺',
          required: 6400,
          available: 4800,
          gap: 1600,
          coveragePct: 75,
          status: 'SHORTAGE',
          unit: 'person-slots',
        },
      ];

  const resourceOperations: ResourceOperationsSummary = {
    categories: resourceCategories,
    totalDeficitCategories: resourceCategories.filter((r) => r.gap > 0).length,
    criticalDeficitCategories: resourceCategories.filter((r) => r.coveragePct < 70).length,
  };

  // 7. Hazard Breakdown
  const floodLocs = priorityLocations.filter((l) => (l.floodRiskScore ?? 0) >= 40);
  const cycloneLocs = priorityLocations.filter((l) => (l.cycloneRiskScore ?? 0) >= 40);
  const multiLocs = priorityLocations.filter((l) => Boolean(l.floodRiskScore && l.cycloneRiskScore));

  const hazardBreakdown: HazardBreakdownItem[] = isReal
    ? []
    : [
        {
          hazard: 'FLOOD',
          title: 'Riverine & Inundation Flood',
          description: 'Mahanadi, Kathajodi, and Godavari river basins experiencing heavy runoff and dam discharge surges.',
          affectedLocationsCount: floodLocs.length,
          highRiskLocationsCount: floodLocs.filter((l) => l.severity === 'CRITICAL' || l.severity === 'HIGH').length,
          averageRisk: floodLocs.length > 0 ? Math.round(floodLocs.reduce((s, l) => s + (l.floodRiskScore ?? 0), 0) / floodLocs.length) : 0,
          highestRisk: Math.max(...floodLocs.map((l) => l.floodRiskScore ?? 0), 0),
          highestRiskLocation: floodLocs[0]?.name ?? 'Mahanadi Delta',
          affectedPopulation: floodLocs.reduce((s, l) => s + l.populationExposed, 0),
          activeAlertsCount: activeAlerts.filter((a) => a.type === 'FLOOD').length,
          icon: '🌊',
        },
        {
          hazard: 'CYCLONE',
          title: 'Tropical Cyclone & Storm Surge',
          description: 'Severe Cyclonic Storm tracking towards Puri–Paradip corridor with high-velocity gale winds and marine surge.',
          affectedLocationsCount: cycloneLocs.length,
          highRiskLocationsCount: cycloneLocs.filter((l) => l.severity === 'CRITICAL' || l.severity === 'HIGH').length,
          averageRisk: cycloneLocs.length > 0 ? Math.round(cycloneLocs.reduce((s, l) => s + (l.cycloneRiskScore ?? 0), 0) / cycloneLocs.length) : 0,
          highestRisk: Math.max(...cycloneLocs.map((l) => l.cycloneRiskScore ?? 0), 0),
          highestRiskLocation: cycloneLocs[0]?.name ?? 'Puri Coastal Belt',
          affectedPopulation: cycloneLocs.reduce((s, l) => s + l.populationExposed, 0),
          activeAlertsCount: activeAlerts.filter((a) => a.type === 'CYCLONE' || a.type === 'STORM_SURGE').length,
          icon: '🌀',
        },
        {
          hazard: 'MULTI_HAZARD',
          title: 'Compound Multi-Hazard Overlap',
          description: 'Coincident marine surge, intense convective rainfall, and overflowing river mouths creating compounding peril.',
          affectedLocationsCount: multiLocs.length,
          highRiskLocationsCount: multiLocs.filter((l) => l.severity === 'CRITICAL' || l.severity === 'HIGH').length,
          averageRisk: multiLocs.length > 0 ? Math.round(multiLocs.reduce((s, l) => s + l.riskScore, 0) / multiLocs.length) : 0,
          highestRisk: Math.max(...multiLocs.map((l) => l.riskScore), 0),
          highestRiskLocation: multiLocs[0]?.name ?? 'Puri Coastal Belt',
          affectedPopulation: multiLocs.reduce((s, l) => s + l.populationExposed, 0),
          activeAlertsCount: activeAlerts.length,
          icon: '🔺',
        },
      ];

  // 8. Dynamic Operational Narrative (Computed from live aggregation)
  const highestDistrict = highestLocation?.district ?? 'Puri District';
  const narrative: OperationalSummaryNarrative = isReal
    ? {
        situation: 'Operational monitoring active. All surveyed sectors report normal baseline conditions with zero active operational disaster declarations.',
        impact: 'Zero population currently exposed to active operational disaster declarations.',
        access: blockedRoadsCount > 0 ? `${blockedRoadsCount} road disruptions reported.` : 'All surveyed road networks report normal operational access.',
        shelters: 'Zero emergency shelter activations currently required in operational mode.',
        resources: 'Standard operational stockpile levels adequate across all sectors.',
        statusLevel: 'MONITORED',
      }
    : {
        situation: `Severe compound hazard active across coastal Odisha and northern AP. Coastal storm surge and gale winds threaten ${highestDistrict}, while Mahanadi basin dam releases create elevated riverine flood risks across ${riskKpis.floodRiskLocationsCount} districts.`,
        impact: `An estimated ${formatNumber(impactKpis.populationExposed)} residents are in elevated hazard zones. Approximately ${formatNumber(impactKpis.estimatedBuildingsAffected)} structures and ${impactKpis.affectedRoadsKm} km of road network face direct flood or wind exposure, with ${impactKpis.affectedHospitals} primary hospitals on high alert.`,
        access: `${blockedRoadsCount} road segments are currently blocked or closed (including key coastal corridors like Puri–Konark Marine Drive), and ${roadOperations.partiallyBlockedCount} segments have partial bottlenecks. Emergency transit to relief centers is constrained in delta sectors.`,
        shelters: `${shelterOperations.totalShelters} designated shelters are mobilized; ${shelterOperations.highUtilizationShelters} shelters report high utilization. Projected evacuation surge indicates a net gap of ${formatNumber(totalCapacityGap)} bed-spaces in vulnerable low-lying blocks.`,
        resources: `Critical supply deficits identified in Drinking Water (${resourceCategories.find((c) => c.category === 'WATER')?.gap.toLocaleString('en-IN') ?? '0'} L gap) and Rescue Boats (${resourceCategories.find((c) => c.category === 'BOATS')?.gap ?? '0'} units). ${resourceOperations.totalDeficitCategories} out of 8 logistics categories require inter-district replenishment.`,
        statusLevel: highestLocation?.riskScore && highestLocation.riskScore >= 75 ? 'CRITICAL' : 'ELEVATED',
      };

  // 9. Situation Trend Timeline
  const timelineTrend: SituationTimelinePoint[] = isReal
    ? []
    : [
        {
          timeLabel: 'T-12h',
          hourOffset: -12,
          riskScore: 42,
          activeAlertsCount: 2,
          shelterPressurePct: 25,
          note: 'Deep depression formed over Bay of Bengal; initial advisory issued',
          isForecast: false,
        },
        {
          timeLabel: 'T-6h',
          hourOffset: -6,
          riskScore: 68,
          activeAlertsCount: 4,
          shelterPressurePct: 52,
          note: 'System upgraded to Severe Cyclonic Storm; coastal evacuations initiated',
          isForecast: false,
        },
        {
          timeLabel: 'T0 (Now)',
          hourOffset: 0,
          riskScore: highestLocation ? highestLocation.riskScore : 88,
          activeAlertsCount: activeAlerts.length,
          shelterPressurePct: 82,
          note: 'Outer rainbands making landfall; Hirakud dam discharge peak',
          isForecast: false,
        },
        {
          timeLabel: 'T+6h',
          hourOffset: 6,
          riskScore: 89,
          activeAlertsCount: activeAlerts.length,
          shelterPressurePct: 94,
          note: 'Projected cyclone center landfall near Puri; peak storm surge window',
          isForecast: true,
        },
        {
          timeLabel: 'T+12h',
          hourOffset: 12,
          riskScore: 74,
          activeAlertsCount: Math.max(1, activeAlerts.length - 2),
          shelterPressurePct: 88,
          note: 'System weakens over land; peak runoff crests in Mahanadi basin',
          isForecast: true,
        },
        {
          timeLabel: 'T+24h',
          hourOffset: 24,
          riskScore: 48,
          activeAlertsCount: 2,
          shelterPressurePct: 62,
          note: 'Depression dissipates into deep low; search, rescue & restoration focus',
          isForecast: true,
        },
      ];

  const activeDisasters = isReal
    ? activeAlerts.map((a) => ({ id: a.id, name: a.title, type: a.type, severity: a.severity }))
    : [
        { id: 'dis-cyclone-01', name: 'Cyclone "Amrita"', type: 'CYCLONE' as const, severity: 'CRITICAL' as const },
        { id: 'dis-flood-02', name: 'Mahanadi Basin Flash Floods', type: 'FLOOD' as const, severity: 'HIGH' as const },
      ];

  const affectedRegions = isReal
    ? Array.from(new Set(activeAlerts.map((a) => a.regionName)))
    : [
        'Puri District',
        'Cuttack District',
        'Khurda District',
        'Jagatsinghpur District',
        'Kendrapara District',
        'Ganjam District',
        'Visakhapatnam (AP)',
      ];

  return {
    overview: {
      activeDisasters,
      affectedRegions,
      highestRiskLocation: isReal
        ? (highestLocation && highestLocation.riskScore > 0 ? highestLocation.name : 'None (Operational Feeds Standby)')
        : (highestLocation?.name ?? 'Puri Coastal Belt & Town'),
    },
    kpis: {
      risk: isReal && !priorityLocations.some((l) => l.riskScore > 0)
        ? {
            highestCurrentRisk: {
              score: 0,
              zoneName: 'None (Operational Feeds Standby)',
              dominantHazard: 'MULTI_HAZARD',
              severity: 'LOW',
            },
            highRiskLocationsCount: 0,
            floodRiskLocationsCount: 0,
            cycloneRiskLocationsCount: 0,
            multiHazardLocationsCount: 0,
          }
        : riskKpis,
      impact: isReal && !priorityLocations.some((l) => l.riskScore > 0)
        ? {
            populationExposed: 0,
            estimatedBuildingsAffected: 0,
            affectedRoadsKm: 0,
            affectedHospitals: 0,
            affectedSchools: 0,
          }
        : impactKpis,
      response: responseKpis,
    },
    priorityLocations,
    activeAlerts,
    citizenIntelligence,
    roadOperations,
    shelterOperations,
    resourceOperations,
    narrative,
    hazardBreakdown,
    timelineTrend,
  };
}

/**
 * Filters the aggregated command center data based on active operations filters.
 */
export function filterCommandCenterLocations(
  locations: PriorityLocation[],
  filters: OperationsFilters,
): PriorityLocation[] {
  return locations.filter((loc) => {
    // Hazard filter
    if (filters.hazard !== 'ALL') {
      if (filters.hazard === 'MULTI_HAZARD') {
        if (!loc.floodRiskScore || !loc.cycloneRiskScore) return false;
      } else if (filters.hazard === 'FLOOD') {
        if (!loc.floodRiskScore || loc.floodRiskScore < 40) return false;
      } else if (filters.hazard === 'CYCLONE') {
        if (!loc.cycloneRiskScore || loc.cycloneRiskScore < 40) return false;
      }
    }

    // Severity filter
    if (filters.severity !== 'ALL' && loc.severity !== filters.severity) {
      return false;
    }

    // District filter
    if (filters.district && filters.district !== 'ALL') {
      if (!loc.district.toLowerCase().includes(filters.district.toLowerCase())) {
        return false;
      }
    }

    // Road status filter
    if (filters.roadStatus !== 'ALL') {
      if (filters.roadStatus === 'BLOCKED' && loc.roadAccessibility !== 'BLOCKED') return false;
      if (filters.roadStatus === 'PARTIALLY_BLOCKED' && loc.roadAccessibility !== 'PARTIAL') return false;
      if (filters.roadStatus === 'OPEN' && loc.roadAccessibility !== 'OPEN') return false;
    }

    // Report status filter
    if (filters.reportStatus !== 'ALL') {
      if (filters.reportStatus === 'EVIDENCE_BACKED' && loc.evidenceReportsCount === 0) return false;
      if (filters.reportStatus === 'VERIFIED' && loc.groundReportsCount === 0) return false;
    }

    return true;
  });
}
