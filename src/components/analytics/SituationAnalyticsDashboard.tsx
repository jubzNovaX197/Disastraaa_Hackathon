'use client';

import { useState, useMemo, useCallback } from 'react';
import { isAuthorizedForOperations } from '@/lib/auth/roles';
import { AuthorityAccessGate } from '@/components/auth/AuthorityAccessGate';
import { SituationAnalyticsHeader } from './SituationAnalyticsHeader';
import { AnalyticsOverviewKpiRow } from './AnalyticsOverviewKpiRow';
import { AnalyticsFilterBar } from './AnalyticsFilterBar';
import { HazardAnalyticsComparison } from './HazardAnalyticsComparison';
import { RiskDistributionChart } from './RiskDistributionChart';
import { AlertAnalyticsPanel } from './AlertAnalyticsPanel';
import { ImpactAnalyticsPanel } from './ImpactAnalyticsPanel';
import { FieldIntelligenceAnalyticsPanel } from './FieldIntelligenceAnalyticsPanel';
import { InfrastructureConditionsPanel } from './InfrastructureConditionsPanel';
import { RegionalSituationTable } from './RegionalSituationTable';
import { TrendAnalysisTimeline } from './TrendAnalysisTimeline';
import { HistoricalComparisonSection } from './HistoricalComparisonSection';
import { AnalyticsMapSection } from './AnalyticsMapSection';
import { LocationDetailPanel } from './LocationDetailPanel';
import {
  buildSituationAnalyticsData,
  filterRegionalRows,
} from '@/lib/analytics/engine';
import type {
  SituationAnalyticsData,
  AnalyticsFilterState,
  RegionalAnalyticsRow,
  RiskDistributionData,
  SeverityDistributionBucket,
} from '@/lib/analytics/types';
import type { Severity } from '@/types';
import { ROLES, type Role } from '@/types/roles';

import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';

interface SituationAnalyticsDashboardProps {
  initialRole?: Role;
}

export function SituationAnalyticsDashboard({
  initialRole = ROLES.STATE_AUTHORITY,
}: SituationAnalyticsDashboardProps) {
  const [role, setRole] = useState<Role>(initialRole);
  const [selectedLocation, setSelectedLocation] = useState<RegionalAnalyticsRow | null>(null);

  // Filters State
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    hazard: 'ALL',
    region: 'ALL',
    severity: 'ALL',
    timePeriod: 'CURRENT_CYCLE',
    alertStatus: 'ALL',
    searchQuery: '',
  });

  // Base Data from Live Intelligence Stream
  const { situationAnalyticsData, refreshNow } = useLiveIntelligence();
  const baseData: SituationAnalyticsData = situationAnalyticsData;

  // Filtered Regional Rows
  const filteredRows = useMemo(() => {
    return filterRegionalRows(baseData.regionalRows, filters);
  }, [baseData.regionalRows, filters]);

  // Available Districts for Filter Dropdown
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    baseData.regionalRows.forEach((r) => set.add(r.district));
    return Array.from(set).sort();
  }, [baseData.regionalRows]);

  // Dynamically recomputed risk distribution based on filtered rows
  const dynamicRiskDistribution = useMemo<RiskDistributionData>(() => {
    const severities: Severity[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
    const total = filteredRows.length;
    const avgScore =
      total > 0
        ? Math.round(filteredRows.reduce((sum, r) => sum + r.riskScore, 0) / total)
        : 0;

    const buckets: SeverityDistributionBucket[] = severities.map((sev) => {
      const matching = filteredRows.filter((r) => r.severity === sev);
      return {
        severity: sev,
        count: matching.length,
        percentage: total > 0 ? Math.round((matching.length / total) * 100) : 0,
        locations: matching.map((r) => r.name),
      };
    });

    return {
      buckets,
      totalLocations: total,
      averageScore: avgScore,
    };
  }, [filteredRows]);

  // Handle tier selection in Risk Distribution chart
  const handleSelectSeverityFromChart = useCallback((sev: Severity | 'ALL') => {
    setFilters((prev) => ({ ...prev, severity: sev }));
  }, []);

  // Authority gate check
  if (!isAuthorizedForOperations(role)) {
    return (
      <div className="p-4 sm:p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
        <AuthorityAccessGate
          currentRole={role}
          onClearanceGranted={(newRole: Role) => setRole(newRole)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      {/* 1. Header */}
      <SituationAnalyticsHeader
        role={role}
        onRefresh={() => {
          // Re-trigger layout sync
          setSelectedLocation(null);
        }}
      />

      {/* 2. Overview KPIs */}
      <AnalyticsOverviewKpiRow kpis={baseData.overviewKpis} />

      {/* 3. Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        availableDistricts={availableDistricts}
      />

      {/* 4. Main Grid: Risk & Hazard Overview (Large) + Active Alerts (Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 space-y-5">
          <HazardAnalyticsComparison comparison={baseData.hazardComparison} />
          <RiskDistributionChart
            distribution={dynamicRiskDistribution}
            selectedSeverity={filters.severity}
            onSelectSeverity={handleSelectSeverityFromChart}
          />
        </div>
        <div className="lg:col-span-4">
          <AlertAnalyticsPanel alertData={baseData.alertAnalytics} />
        </div>
      </div>

      {/* 5. Impact Assessment + Field Intelligence + Infrastructure Conditions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-12">
          <ImpactAnalyticsPanel impact={baseData.impactAnalytics} />
        </div>
        <div className="lg:col-span-6">
          <FieldIntelligenceAnalyticsPanel fieldData={baseData.fieldIntelligence} />
        </div>
        <div className="lg:col-span-6">
          <InfrastructureConditionsPanel infrastructure={baseData.infrastructure} />
        </div>
      </div>

      {/* 6. Regional Situation (Table) + Trend Analysis (Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <RegionalSituationTable
            rows={filteredRows}
            selectedLocationId={selectedLocation?.id}
            onSelectLocation={setSelectedLocation}
          />
        </div>
        <div className="lg:col-span-5 space-y-5">
          <TrendAnalysisTimeline timeline={baseData.trendTimeline} />
          <HistoricalComparisonSection historicalData={baseData.historicalComparison} />
        </div>
      </div>

      {/* 7. Geospatial Analytics Map */}
      <div className="w-full">
        <AnalyticsMapSection
          selectedLocation={selectedLocation}
          onClearSelection={() => setSelectedLocation(null)}
        />
      </div>

      {/* 8. Slide-out Location Detail Panel */}
      <LocationDetailPanel
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
      />
    </div>
  );
}
