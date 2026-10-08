/**
 * Evacuation Management Engine
 *
 * Pure, deterministic functions.
 * Reuses existing risk/impact data — does NOT create a new risk engine.
 */

import type { EvacuationZone, EvacuationSummary, ShelterPressure } from './types';
import { EVACUATION_STATUS } from './types';

// ── Shelter pressure helper ───────────────────────────────────────────────────

export function computeShelterPressure(
  capacity: number,
  occupancy: number,
  allocated: number,
): ShelterPressure {
  if (capacity === 0) return 'UNAVAILABLE';
  const projected = occupancy + allocated;
  const ratio = projected / capacity;
  if (ratio > 1.0)  return 'OVER_CAPACITY';
  if (ratio > 0.85) return 'NEAR_CAPACITY';
  if (ratio > 0.55) return 'FILLING';
  return 'AVAILABLE';
}

// ── Summary across all zones ──────────────────────────────────────────────────

export function summariseEvacuation(zones: EvacuationZone[]): EvacuationSummary {
  const active    = zones.filter((z) => z.evacuationStatus === EVACUATION_STATUS.EVACUATION_ACTIVE);
  const advisory  = zones.filter((z) => z.evacuationStatus === EVACUATION_STATUS.EVACUATION_ADVISED);
  const completed = zones.filter((z) => z.evacuationStatus === EVACUATION_STATUS.EVACUATION_COMPLETED);

  const totalRequired  = zones.reduce((s, z) => s + z.evacuationRequired, 0);
  const totalEvacuated = zones.reduce((s, z) => s + z.evacuated, 0);
  const totalCapacity  = zones.reduce((s, z) => s + z.totalAllocatedCapacity, 0);
  const totalGap       = zones.reduce((s, z) => s + Math.max(0, z.capacityGap), 0);

  const sheltersUnderPressure = zones.reduce((s, z) => {
    const pressured = z.assignedShelters.filter(
      (sh) => sh.pressure === 'NEAR_CAPACITY' || sh.pressure === 'OVER_CAPACITY',
    );
    return s + pressured.length;
  }, 0);

  const blockedPrimaryRoutes = zones.reduce((s, z) => {
    const blocked = z.routes.filter((r) => r.isPrimary && r.status === 'BLOCKED');
    return s + blocked.length;
  }, 0);

  const progressPct =
    totalRequired > 0
      ? Math.min(100, Math.round((totalEvacuated / totalRequired) * 100))
      : 0;

  return {
    totalZones:              zones.length,
    activeZones:             active.length,
    advisoryZones:           advisory.length,
    completedZones:          completed.length,
    totalPopulationAtRisk:   zones.reduce((s, z) => s + z.estimatedPopulation, 0),
    totalEvacuationRequired: totalRequired,
    totalEvacuated:          totalEvacuated,
    totalRemaining:          totalRequired - totalEvacuated,
    progressPct,
    totalAllocatedCapacity:  totalCapacity,
    totalCapacityGap:        totalGap,
    sheltersUnderPressure,
    blockedPrimaryRoutes,
  };
}

// ── Zone sorting ──────────────────────────────────────────────────────────────

/** Sort zones by priority (1 = highest) then by risk score */
export function sortZonesByPriority(zones: EvacuationZone[]): EvacuationZone[] {
  return [...zones].sort((a, b) =>
    a.priority !== b.priority ? a.priority - b.priority : b.riskScore - a.riskScore,
  );
}

/** Return the remaining (not-yet-evacuated) count */
export function remainingEvacuees(zone: EvacuationZone): number {
  return Math.max(0, zone.evacuationRequired - zone.evacuated);
}

/** Human-readable evacuation status label */
export function evacuationStatusLabel(status: string): string {
  const map: Record<string, string> = {
    MONITORING:           'Monitoring',
    PREPARE:              'Prepare',
    EVACUATION_ADVISED:   'Advised',
    EVACUATION_ACTIVE:    'Active',
    EVACUATION_COMPLETED: 'Completed',
  };
  return map[status] ?? status;
}
