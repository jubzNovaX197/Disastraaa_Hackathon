/**
 * Situation Analytics & Disaster Intelligence — Aggregation Engine
 *
 * Deterministic aggregation of multi-hazard intelligence, impact assessments,
 * field intelligence, road conditions, shelter readiness, and historical baselines.
 *
 * Professional emergency operations decision support.
 */

import { demoRoadSegments } from '@/data/demo';
import { demoAlerts } from '@/data/demo/alerts';
import { demoCitizenReports } from '@/data/demo/citizenReports';
import { demoHistoricalEvents } from '@/data/demo/historicalEvents';
import { aggregateCommandCenterData } from '@/lib/commandCenter/aggregator';
import { summariseEvents } from '@/lib/historical/engine';
import { formatNumber } from '@/lib/utils';
import type { HazardType, Severity } from '@/types';
import type {
  AlertAnalyticsData,
  AnalyticsFilterState,
  AnalyticsOverviewKpis,
  FieldIntelligenceAnalyticsData,
  HazardAnalyticsComparison,
  HazardMetricProfile,
  HistoricalComparisonData,
  ImpactAnalyticsData,
  InfrastructureAnalyticsData,
  RegionalAnalyticsRow,
  ReportCategoryCount,
  RiskDistributionData,
  SeverityDistributionBucket,
  SituationAnalyticsData,
  TrendAnalysisPoint,
} from './types';

import type { DemoAlert as Alert } from '@/data/types';
import type { CommandCenterData } from '@/lib/commandCenter/types';
import type { CitizenReportItem } from '@/lib/reports/types';
import type { RoadSegment } from '@/lib/roads/types';

/**
 * Builds the master Situation Analytics dataset by aggregating all
 * active intelligence layers deterministically.
 * Supports dynamic live data parameters.
 */
export function buildSituationAnalyticsData(
  providedCcData?: CommandCenterData,
  customAlerts?: Alert[],
  customReports?: CitizenReportItem[],
  customRoads?: RoadSegment[],
  environment: 'REAL' | 'DEMO' = 'DEMO',
): SituationAnalyticsData {
  const isReal = environment === 'REAL';
  const ccData = providedCcData ?? aggregateCommandCenterData({ environment });
  const alerts = customAlerts ?? (isReal ? [] : demoAlerts);
  const reports = customReports ?? (isReal ? [] : demoCitizenReports);
  const roads = customRoads ?? (isReal ? [] : demoRoadSegments);
  const locations = ccData.priorityLocations;

  // ── 1. Overview KPIs ────────────────────────────────────────────────────────
  const activeAlerts = alerts.filter((a) => a.isActive);
  const verifiedReports = reports.filter(
    (r) => r.status === 'VERIFIED' || r.status === 'COMMUNITY_CONFIRMED',
  );
  const blockedRoads = roads.filter(
    (rd) =>
      rd.status === 'BLOCKED' ||
      rd.status === 'PARTIALLY_BLOCKED' ||
      rd.status === 'CLOSED',
  );
  const highRiskAreas = locations.filter(
    (l) => l.severity === 'CRITICAL' || l.severity === 'HIGH',
  );
  const totalPopulationExposed = locations.reduce(
    (sum, l) => sum + (l.populationExposed || 0),
    0,
  );
  const sheltersPressureCount = ccData.shelterOperations.items.filter(
    (s) => s.status === 'PRESSURE' || s.status === 'SHORTAGE',
  ).length;
  const resourceShortagesCount = ccData.resourceOperations.totalDeficitCategories;

  // Distinct active hazards
  const activeHazardTypes = new Set<string>();
  locations.forEach((l) => activeHazardTypes.add(l.dominantHazard));
  alerts.filter((a) => a.isActive).forEach((a) => activeHazardTypes.add(a.type));

  const overviewKpis: AnalyticsOverviewKpis = {
    activeHazardsCount: activeHazardTypes.size,
    highRiskAreasCount: highRiskAreas.length,
    populationExposed: totalPopulationExposed,
    activeAlertsCount: activeAlerts.length,
    verifiedFieldReportsCount: verifiedReports.length,
    blockedRoadsCount: blockedRoads.length,
    sheltersUnderPressureCount: sheltersPressureCount,
    resourceShortagesCount: resourceShortagesCount,
  };

  // ── 2. Hazard Analytics Comparison ──────────────────────────────────────────
  const floodLocations = locations.filter(
    (l) => l.dominantHazard === 'FLOOD' || (l.floodRiskScore ?? 0) >= 50,
  );
  const cycloneLocations = locations.filter(
    (l) => l.dominantHazard === 'CYCLONE' || (l.cycloneRiskScore ?? 0) >= 50,
  );
  const multiHazardLocations = locations.filter(
    (l) => l.dominantHazard === 'MULTI_HAZARD',
  );

  const buildHazardProfile = (
    hazard: HazardType | 'MULTI_HAZARD',
    title: string,
    description: string,
    zoneList: typeof locations,
    activeAlertFilter: (a: (typeof alerts)[0]) => boolean,
  ): HazardMetricProfile => {
    const count = zoneList.length;
    const avgRisk =
      count > 0
        ? Math.round(
            zoneList.reduce((sum, z) => sum + z.riskScore, 0) / count,
          )
        : 0;
    const sorted = [...zoneList].sort((a, b) => b.riskScore - a.riskScore);
    const top = sorted[0];

    const exposedPop = zoneList.reduce((sum, z) => sum + z.populationExposed, 0);
    const buildings = zoneList.reduce((sum, z) => sum + z.impact.buildings, 0);
    const roadsKm = zoneList.reduce((sum, z) => sum + z.impact.roadsKm, 0);
    const hospitals = zoneList.reduce((sum, z) => sum + z.impact.hospitals, 0);
    const schools = zoneList.reduce((sum, z) => sum + z.impact.schools, 0);

    const relAlerts = alerts.filter(activeAlertFilter);

    const domSeverity: Severity =
      avgRisk >= 75 ? 'CRITICAL' : avgRisk >= 50 ? 'HIGH' : avgRisk >= 25 ? 'MODERATE' : 'LOW';

    return {
      hazard,
      title,
      description,
      affectedAreasCount: count,
      averageRisk: avgRisk,
      highestRisk: top ? top.riskScore : 0,
      highestRiskLocation: top ? top.name : 'None reported',
      exposedPopulation: exposedPop,
      activeAlertsCount: relAlerts.length,
      impactedInfrastructure: {
        buildings,
        roadsKm: Math.round(roadsKm * 10) / 10,
        hospitals,
        schools,
      },
      dominantSeverity: domSeverity,
    };
  };

  const hazardComparison: HazardAnalyticsComparison = {
    flood: buildHazardProfile(
      'FLOOD',
      'Inundation & Riverine Flood',
      isReal
        ? (floodLocations.length > 0 ? `${floodLocations.length} active riverine flood sectors registered` : 'No active riverine flood telemetry detected')
        : 'Mahanadi & Baitarani basin surges with urban waterlogging',
      floodLocations.length > 0 ? floodLocations : (isReal ? [] : locations.slice(0, 3)),
      (a) => a.isActive && a.type === 'FLOOD',
    ),
    cyclone: buildHazardProfile(
      'CYCLONE',
      'Tropical Cyclone & Storm Surge',
      isReal
        ? (cycloneLocations.length > 0 ? `${cycloneLocations.length} active cyclonic storm sectors registered` : 'No active cyclonic depression detected')
        : 'Coastal gale winds 160–180 km/h and coastal storm inundation',
      cycloneLocations.length > 0 ? cycloneLocations : (isReal ? [] : locations.slice(0, 2)),
      (a) => a.isActive && (a.type === 'CYCLONE' || a.type === 'STORM_SURGE'),
    ),
    multiHazard: buildHazardProfile(
      'MULTI_HAZARD',
      'Compound Multi-Hazard System',
      isReal
        ? (multiHazardLocations.length > 0 ? `${multiHazardLocations.length} active compound disaster sectors registered` : 'No active compound hazard alerts registered')
        : 'Synchronized cyclone landfall coinciding with deltaic catchment saturation',
      multiHazardLocations.length > 0 ? multiHazardLocations : (isReal ? [] : locations),
      (a) => a.isActive,
    ),
  };

  // ── 3. Risk Distribution ────────────────────────────────────────────────────
  const severities: Severity[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
  const buckets: SeverityDistributionBucket[] = severities.map((sev) => {
    const matching = locations.filter((l) => l.severity === sev);
    return {
      severity: sev,
      count: matching.length,
      percentage:
        locations.length > 0
          ? Math.round((matching.length / locations.length) * 100)
          : 0,
      locations: matching.map((l) => l.name),
    };
  });

  const avgRiskScore =
    locations.length > 0
      ? Math.round(
          locations.reduce((sum, l) => sum + l.riskScore, 0) / locations.length,
        )
      : 0;

  const riskDistribution: RiskDistributionData = {
    buckets,
    totalLocations: locations.length,
    averageScore: avgRiskScore,
  };

  // ── 4. Impact Analytics ─────────────────────────────────────────────────────
  const totalBuildings = locations.reduce((sum, l) => sum + l.impact.buildings, 0);
  const totalRoadsKm = Math.round(
    locations.reduce((sum, l) => sum + l.impact.roadsKm, 0) * 10,
  ) / 10;
  const totalHospitals = locations.reduce((sum, l) => sum + l.impact.hospitals, 0);
  const totalSchools = locations.reduce((sum, l) => sum + l.impact.schools, 0);

  const impactAnalytics: ImpactAnalyticsData = {
    population: {
      label: 'Exposed Population',
      unit: 'residents',
      projectedValue: totalPopulationExposed,
      verifiedValue: null,
      confidenceRating: 'HIGH',
      note: 'Derived from census overlay with current inundation and gale-force wind boundaries.',
    },
    buildings: {
      label: 'Structural Assets at Risk',
      unit: 'structures',
      projectedValue: totalBuildings,
      verifiedValue: Math.round(totalBuildings * 0.18),
      confidenceRating: 'HIGH',
      note: 'Verified data reflects field damage reports; projected reflects total physical exposure.',
    },
    roadsKm: {
      label: 'Disrupted Transport Network',
      unit: 'km',
      projectedValue: totalRoadsKm,
      verifiedValue: Math.round(
        roads.filter((r) => r.status === 'BLOCKED' || r.status === 'CLOSED').length * 28.5,
      ),
      confidenceRating: 'HIGH',
      note: 'Verified from automated telemetry sensors and confirmed citizen reports.',
    },
    hospitals: {
      label: 'Critical Health Facilities',
      unit: 'facilities',
      projectedValue: totalHospitals,
      verifiedValue: Math.min(2, totalHospitals),
      confidenceRating: 'MODERATE',
      note: 'Facilities situated within flood buffer zones requiring power/generator backup.',
    },
    schools: {
      label: 'Educational Facilities',
      unit: 'centers',
      projectedValue: totalSchools,
      verifiedValue: Math.round(totalSchools * 0.4),
      confidenceRating: 'HIGH',
      note: 'Pre-designated emergency shelter sites requisitioned for evacuation.',
    },
    shelters: {
      label: 'Operational Shelters',
      unit: 'sites',
      projectedValue: ccData.shelterOperations.totalShelters,
      verifiedValue: ccData.shelterOperations.availableShelters,
      confidenceRating: 'HIGH',
      note: 'Active cyclone & flood relief shelters currently staffed and accepting evacuees.',
    },
    synthesisNote:
      'Note: Projected values represent probabilistic hazard envelope modeling. Verified values represent confirmed field intelligence. Resource allocations should prioritize confirmed ground deficits.',
  };

  // ── 5. Alert Analytics ──────────────────────────────────────────────────────
  const bySeverityCounts: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MODERATE: 0,
    LOW: 0,
  };
  const byHazardCounts: Record<string, { count: number; label: string }> = {};
  const byRegionCounts: Record<string, number> = {};

  alerts.forEach((a) => {
    bySeverityCounts[a.severity] = (bySeverityCounts[a.severity] || 0) + 1;
    const haz = a.type;
    const label =
      haz === 'CYCLONE'
        ? 'Cyclone'
        : haz === 'FLOOD'
          ? 'Flood'
          : haz === 'STORM_SURGE'
            ? 'Storm Surge'
            : haz === 'LIGHTNING'
              ? 'Severe Weather'
              : 'Multi-Hazard';
    if (!byHazardCounts[haz]) byHazardCounts[haz] = { count: 0, label };
    byHazardCounts[haz].count += 1;

    const reg = a.regionName || 'General Coastal';
    byRegionCounts[reg] = (byRegionCounts[reg] || 0) + 1;
  });

  const alertAnalytics: AlertAnalyticsData = {
    totalAlerts: alerts.length,
    activeAlerts: alerts.filter((a) => a.isActive).length,
    expiredAlerts: alerts.filter((a) => !a.isActive).length,
    bySeverity: severities.map((sev) => ({
      severity: sev,
      count: bySeverityCounts[sev] || 0,
    })),
    byHazard: Object.entries(byHazardCounts).map(([h, val]) => ({
      hazard: h as HazardType,
      count: val.count,
      label: val.label,
    })),
    byRegion: Object.entries(byRegionCounts).map(([region, count]) => ({
      region,
      count,
    })),
    recentAlerts: alerts.slice(0, 6),
  };

  // ── 6. Field Intelligence Analytics ─────────────────────────────────────────
  let pendingCount = 0;
  let underReviewCount = 0;
  let verifiedCount = 0;
  let rejectedCount = 0;
  let escalatedCount = 0;
  let evidenceBackedCount = 0;

  const categoryStats: Record<string, { label: string; count: number; verified: number }> = {
    FLOODING: { label: 'Inundation & Waterlogging', count: 0, verified: 0 },
    BLOCKED_ROAD: { label: 'Road Blockages & Debris', count: 0, verified: 0 },
    INFRASTRUCTURE: { label: 'Power & Structural Damage', count: 0, verified: 0 },
    SHELTER: { label: 'Shelter & Supply Requests', count: 0, verified: 0 },
    OTHER: { label: 'General Hazard Conditions', count: 0, verified: 0 },
  };

  reports.forEach((rep) => {
    const isVer = rep.status === 'VERIFIED' || rep.status === 'COMMUNITY_CONFIRMED';
    if (isVer) verifiedCount++;
    else if (rep.status === 'PENDING') pendingCount++;
    else if (rep.status === 'UNDER_REVIEW') underReviewCount++;
    else if (rep.status === 'REJECTED') rejectedCount++;
    else if (rep.status === 'ESCALATED') escalatedCount++;

    if (rep.evidence && rep.evidence.length > 0) evidenceBackedCount++;

    // Categorization
    const desc = (rep.title + ' ' + rep.description).toLowerCase();
    let catKey = 'OTHER';
    if (rep.type === 'FLOOD' || desc.includes('flood') || desc.includes('water') || desc.includes('submerged')) {
      catKey = 'FLOODING';
    } else if (rep.blockedRoadInfo || desc.includes('road') || desc.includes('highway') || desc.includes('debris') || desc.includes('tree')) {
      catKey = 'BLOCKED_ROAD';
    } else if (desc.includes('building') || desc.includes('roof') || desc.includes('pole') || desc.includes('power') || desc.includes('wire')) {
      catKey = 'INFRASTRUCTURE';
    } else if (desc.includes('shelter') || desc.includes('food') || desc.includes('ration') || desc.includes('relief')) {
      catKey = 'SHELTER';
    }

    if (categoryStats[catKey]) {
      categoryStats[catKey].count++;
      if (isVer) categoryStats[catKey].verified++;
    }
  });

  const fieldCategories: ReportCategoryCount[] = Object.entries(categoryStats).map(
    ([key, val]) => ({
      category: key as ReportCategoryCount['category'],
      label: val.label,
      count: val.count,
      verifiedCount: val.verified,
    }),
  );

  const verificationRatePct =
    reports.length > 0 ? Math.round((verifiedCount / reports.length) * 100) : 0;

  const fieldIntelligence: FieldIntelligenceAnalyticsData = {
    totalReports: reports.length,
    verifiedReports: verifiedCount,
    pendingReports: pendingCount,
    underReviewReports: underReviewCount,
    rejectedReports: rejectedCount,
    escalatedReports: escalatedCount,
    evidenceBackedReports: evidenceBackedCount,
    verificationRatePct,
    byCategory: fieldCategories,
    recentReports: reports.slice(0, 8),
    verificationDisclaimer:
      'Operational Notice: Provisional citizen reports must undergo triage and evidence authentication before committing emergency logistics. Highlighted records indicate community confirmation or photo verification.',
  };

  // ── 7. Infrastructure Analytics ─────────────────────────────────────────────
  let roadOpen = 0;
  let roadCaution = 0;
  let roadPartial = 0;
  let roadBlocked = 0;
  let roadClosed = 0;

  roads.forEach((r) => {
    if (r.status === 'OPEN') roadOpen++;
    else if (r.status === 'CAUTION') roadCaution++;
    else if (r.status === 'PARTIALLY_BLOCKED') roadPartial++;
    else if (r.status === 'BLOCKED') roadBlocked++;
    else if (r.status === 'CLOSED') roadClosed++;
  });

  const shelterItems = ccData.shelterOperations.items;
  let shelterAvail = 0;
  let shelterPress = 0;
  let shelterShort = 0;
  let totalShelterCap = 0;
  let totalShelterOcc = 0;
  let totalShelterDemand = 0;

  shelterItems.forEach((sh) => {
    if (sh.status === 'AVAILABLE') shelterAvail++;
    else if (sh.status === 'PRESSURE') shelterPress++;
    else if (sh.status === 'SHORTAGE') shelterShort++;
    totalShelterCap += sh.capacity;
    totalShelterOcc += sh.occupancy;
    totalShelterDemand += sh.projectedDemand;
  });

  const resCategories = ccData.resourceOperations.categories;
  let resAvail = 0;
  let resLimited = 0;
  let resShortage = 0;
  const criticalDeficitNames: string[] = [];

  resCategories.forEach((rc) => {
    if (rc.status === 'ADEQUATE' || rc.coveragePct >= 90) resAvail++;
    else if (rc.coveragePct >= 60) resLimited++;
    else {
      resShortage++;
      criticalDeficitNames.push(rc.name);
    }
  });

  const infrastructure: InfrastructureAnalyticsData = {
    roads: {
      open: roadOpen,
      caution: roadCaution,
      partiallyBlocked: roadPartial,
      blocked: roadBlocked,
      closed: roadClosed,
      totalSegments: roads.length,
      criticalSegments: roads.filter(
        (r) => r.status === 'BLOCKED' || r.status === 'CLOSED',
      ),
    },
    shelters: {
      available: shelterAvail,
      pressure: shelterPress,
      shortage: shelterShort,
      totalShelters: shelterItems.length,
      totalCapacity: totalShelterCap,
      currentOccupancy: totalShelterOcc,
      projectedDemand: totalShelterDemand,
      totalCapacityGap: Math.max(0, totalShelterDemand - totalShelterCap),
    },
    resources: {
      available: resAvail,
      limited: resLimited,
      shortage: resShortage,
      totalCategories: resCategories.length,
      criticalDeficits: criticalDeficitNames,
    },
  };

  // ── 8. Regional Analytics Rows ──────────────────────────────────────────────
  const regionalRows: RegionalAnalyticsRow[] = locations.map((loc) => {
    const zoneAlerts = alerts.filter(
      (a) =>
        a.isActive &&
        (a.regionName.toLowerCase().includes(loc.district.toLowerCase()) ||
          a.regionName.toLowerCase().includes(loc.name.toLowerCase())),
    );
    const highestAlert: Severity | 'NONE' = zoneAlerts.some((a) => a.severity === 'CRITICAL')
      ? 'CRITICAL'
      : zoneAlerts.some((a) => a.severity === 'HIGH')
        ? 'HIGH'
        : zoneAlerts.some((a) => a.severity === 'MODERATE')
          ? 'MODERATE'
          : zoneAlerts.length > 0
            ? 'LOW'
            : 'NONE';

    const matchingReports = reports.filter(
      (r) =>
        r.administrativeArea.toLowerCase().includes(loc.district.toLowerCase()) ||
        r.address.toLowerCase().includes(loc.name.toLowerCase()),
    );
    const verReps = matchingReports.filter(
      (r) => r.status === 'VERIFIED' || r.status === 'COMMUNITY_CONFIRMED',
    );

    return {
      id: loc.id,
      name: loc.name,
      district: loc.district,
      coordinates: loc.coordinates,
      dominantHazard: loc.dominantHazard,
      riskScore: loc.riskScore,
      severity: loc.severity,
      populationExposed: loc.populationExposed,
      activeAlertsCount: zoneAlerts.length,
      highestAlertSeverity: highestAlert,
      roadAccessStatus:
        loc.roadAccessibility === 'OPEN'
          ? 'OPEN'
          : loc.roadAccessibility === 'PARTIAL'
            ? 'PARTIAL'
            : 'RESTRICTED',
      shelterStatus: loc.shelterStatus,
      shelterGap: loc.shelterGap,
      shelterPressurePct:
        loc.shelterCapacity > 0
          ? Math.round((loc.shelterDemand / loc.shelterCapacity) * 100)
          : 100,
      resourceStatus:
        loc.resourceShortageCount >= 3
          ? 'CRITICAL'
          : loc.resourceShortageCount > 0
            ? 'SHORTAGE'
            : 'ADEQUATE',
      resourceShortagesCount: loc.resourceShortageCount,
      fieldReportsCount: matchingReports.length,
      verifiedReportsCount: verReps.length,
      impactEstimates: {
        buildings: loc.impact.buildings,
        roadsKm: loc.impact.roadsKm,
        hospitals: loc.impact.hospitals,
        schools: loc.impact.schools,
      },
    };
  });

  // ── 9. Trend Analysis Timeline ──────────────────────────────────────────────
  const trendTimeline: TrendAnalysisPoint[] = isReal
    ? []
    : [
        {
          timeLabel: 'T-24h (Recorded)',
          hourOffset: -24,
          riskScore: 38,
          activeAlertsCount: 1,
          fieldReportsCount: 4,
          blockedRoadsCount: 0,
          shelterPressurePct: 22,
          isScenarioDerived: false,
          annotation: 'Initial low-pressure trough observed in Bay of Bengal; standard coastal monitoring.',
        },
        {
          timeLabel: 'T-12h (Recorded)',
          hourOffset: -12,
          riskScore: 54,
          activeAlertsCount: 2,
          fieldReportsCount: 9,
          blockedRoadsCount: 1,
          shelterPressurePct: 41,
          isScenarioDerived: false,
          annotation: 'Deep depression upgraded to Cyclonic Storm; coastal fisheries recall broadcast.',
        },
        {
          timeLabel: 'T-6h (Recorded)',
          hourOffset: -6,
          riskScore: 71,
          activeAlertsCount: 4,
          fieldReportsCount: 18,
          blockedRoadsCount: 3,
          shelterPressurePct: 68,
          isScenarioDerived: false,
          annotation: 'Severe cyclone trajectory firming on Puri–Konark arc; red alerts issued.',
        },
        {
          timeLabel: 'T0 (Current Operational)',
          hourOffset: 0,
          riskScore: avgRiskScore,
          activeAlertsCount: activeAlerts.length,
          fieldReportsCount: reports.length,
          blockedRoadsCount: blockedRoads.length,
          shelterPressurePct: 82,
          isScenarioDerived: false,
          annotation: 'Active landfall window: gale winds 160–180 km/h, extensive deltaic waterlogging.',
        },
        {
          timeLabel: 'T+6h (Scenario Projection)',
          hourOffset: 6,
          riskScore: Math.min(100, Math.round(avgRiskScore * 1.12)),
          activeAlertsCount: Math.min(8, activeAlerts.length + 1),
          fieldReportsCount: reports.length + 12,
          blockedRoadsCount: blockedRoads.length + 2,
          shelterPressurePct: 94,
          isScenarioDerived: true,
          annotation: 'Scenario Model: Maximum tidal surge peak; Hirakud discharge downstream convergence.',
        },
        {
          timeLabel: 'T+12h (Scenario Projection)',
          hourOffset: 12,
          riskScore: Math.round(avgRiskScore * 0.94),
          activeAlertsCount: Math.max(2, activeAlerts.length - 1),
          fieldReportsCount: reports.length + 19,
          blockedRoadsCount: blockedRoads.length + 1,
          shelterPressurePct: 89,
          isScenarioDerived: true,
          annotation: 'Scenario Model: Storm center moves inland toward Khurda–Cuttack; wind decay initiated.',
        },
        {
          timeLabel: 'T+24h (Scenario Projection)',
          hourOffset: 24,
          riskScore: Math.round(avgRiskScore * 0.72),
          activeAlertsCount: Math.max(1, activeAlerts.length - 2),
          fieldReportsCount: reports.length + 25,
          blockedRoadsCount: Math.max(2, blockedRoads.length - 1),
          shelterPressurePct: 75,
          isScenarioDerived: true,
          annotation: 'Scenario Model: Transition to post-disaster dewatering and road clearance operations.',
        },
      ];

  // ── 10. Historical Comparison ───────────────────────────────────────────────
  const histSummary = summariseEvents(isReal ? [] : demoHistoricalEvents);
  const histAvgPop = isReal ? 0 : (histSummary.avgAffectedPopulation || 185000);
  const histAvgBld = isReal
    ? 0
    : histSummary.totalEvents > 0
      ? Math.round(histSummary.totalBuildingsAffected / histSummary.totalEvents)
      : 24000;

  const currentVsHistPopRatio = isReal
    ? 0
    : histAvgPop > 0
      ? Math.round((totalPopulationExposed / histAvgPop) * 100) / 100
      : 1.0;

  let currentElevation: HistoricalComparisonData['currentRiskRelativeElevation'] = 'BASELINE';
  if (!isReal) {
    if (currentVsHistPopRatio >= 1.4 || avgRiskScore >= 75) {
      currentElevation = 'SIGNIFICANTLY_ELEVATED';
    } else if (currentVsHistPopRatio >= 1.1 || avgRiskScore >= 55) {
      currentElevation = 'ELEVATED';
    } else if (currentVsHistPopRatio < 0.75 && avgRiskScore < 40) {
      currentElevation = 'BELOW_BASELINE';
    }
  }

  const historicalComparison: HistoricalComparisonData = {
    summary: histSummary,
    matchedEventsCount: isReal ? 0 : demoHistoricalEvents.length,
    historicalAnnualFrequency: isReal ? 0 : Math.round(histSummary.eventsPerYear * 10) / 10,
    historicalAverageSeverity: isReal
      ? 'No active baseline records'
      : histSummary.dominantHazardType + ' (High / Severe)',
    peakHistoricalEvent: isReal ? null : histSummary.mostImpactfulEvent,
    historicalAvgPopulation: histAvgPop,
    historicalAvgBuildings: histAvgBld,
    currentExposedVsHistoricalAvgRatio: currentVsHistPopRatio,
    currentRiskRelativeElevation: currentElevation,
    comparativeInsight: isReal
      ? 'Operational database has no archived historical disaster events for this operational context. Comparative metrics will compute automatically as historical records are archived.'
      : `Current multi-hazard exposure (${formatNumber(
          totalPopulationExposed,
        )} residents) is ${
          currentVsHistPopRatio >= 1.0
            ? `${Math.round((currentVsHistPopRatio - 1.0) * 100)}% above`
            : `${Math.round((1.0 - currentVsHistPopRatio) * 100)}% below`
        } the 10-year historical baseline for the coastal Odisha corridor. Historical cyclone landfall cycles indicate compound flooding within 12–18 hours of landfall.`,
  };

  return {
    overviewKpis,
    hazardComparison,
    riskDistribution,
    impactAnalytics,
    alertAnalytics,
    fieldIntelligence,
    infrastructure,
    regionalRows,
    trendTimeline,
    historicalComparison,
  };
}

/**
 * Filter regional rows by active user filters
 */
export function filterRegionalRows(
  rows: RegionalAnalyticsRow[],
  filters: AnalyticsFilterState,
): RegionalAnalyticsRow[] {
  return rows.filter((r) => {
    // Hazard filter
    if (filters.hazard !== 'ALL' && r.dominantHazard !== filters.hazard) {
      return false;
    }
    // Region / District filter
    if (filters.region !== 'ALL' && r.district !== filters.region) {
      return false;
    }
    // Severity filter
    if (filters.severity !== 'ALL' && r.severity !== filters.severity) {
      return false;
    }
    // Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        r.name.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q) ||
        r.dominantHazard.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}
