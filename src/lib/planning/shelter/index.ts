/**
 * Shelter Requirement Planning Engine — Public API
 *
 * ⚠️  PROTOTYPE / DEMO ONLY.
 * Deterministic planning model — not official government standards.
 */

import type { Shelter } from '@/data/types';
import { getLocationHistory } from '@/lib/historical/engine';
import type { HistoricalDisasterEvent } from '@/lib/historical/types';
import type { Severity } from '@/types';
import { calculateShelterRequirement } from './engine';
import type {
  ShelterPlanningInputs,
  ShelterPlanningResult,
  ShelterPlanningStatus,
  ShelterSummaryItem,
} from './types';

export type {
  ShelterPlanningInputs,
  ShelterPlanningResult,
  ShelterPlanningStatus,
  ShelterSummaryItem
};

  export { calculateShelterRequirement };

// ── Zone to shelter mapping (demo prototype) ──────────────────────────────────
export const ZONE_SHELTER_IDS: Record<string, string[]> = {
  // Puri Coastal Belt & Cyclone Landfall
  'mh-puri-coast':        ['sh-puri-1', 'sh-puri-2'],
  'rz-puri-coast':        ['sh-puri-1', 'sh-puri-2'],
  'crz-puri-landfall':    ['sh-puri-1', 'sh-puri-2'],

  // Chilika Lake Region
  'mh-chilika':           ['sh-puri-2'],
  'rz-chilika-south':     ['sh-puri-2'],
  'crz-chilika-surge':    ['sh-puri-2'],

  // Gopalpur Coast
  'mh-gopalpur-south':    ['sh-puri-2'],
  'crz-gopalpur-south':   ['sh-puri-2'],

  // Mahanadi Delta / Cuttack
  'mh-mahanadi-delta':    ['sh-cuttack-1', 'sh-cuttack-2', 'sh-kendrapara-1'],
  'rz-mahanadi-delta':    ['sh-cuttack-1', 'sh-cuttack-2'],

  // Bhubaneswar Urban
  'mh-bhubaneswar-urban': ['sh-bhubaneswar-1', 'sh-cuttack-1'],
  'rz-bhubaneswar-urban': ['sh-bhubaneswar-1'],

  // Paradip Port
  'mh-paradip-port':      ['sh-kendrapara-1', 'sh-cuttack-2'],
  'crz-paradip-port':     ['sh-kendrapara-1'],

  // Kendrapara & Bhadrak Coast
  'mh-kendrapara-coast':  ['sh-kendrapara-1', 'sh-bhadrak-1'],
  'crz-kendrapara-coast': ['sh-kendrapara-1', 'sh-bhadrak-1'],

  // Visakhapatnam & AP
  'mh-visakhapatnam':     ['sh-vizag-1'],
  'rz-visakha-hills':     ['sh-vizag-1'],
  'crz-visakha-cyclone':  ['sh-vizag-1'],

  // Godavari Floodplain
  'mh-godavari-ap':       ['sh-vizag-1'],
  'rz-godavari-ap':       ['sh-vizag-1'],
};

// ── Zone to historical region code mapping ────────────────────────────────────
export const ZONE_TO_REGION_CODE: Record<string, string> = {
  'mh-puri-coast':        'OD-PURI',
  'rz-puri-coast':        'OD-PURI',
  'crz-puri-landfall':    'OD-PURI',
  'mh-chilika':           'OD-PURI',
  'rz-chilika-south':     'OD-PURI',
  'crz-chilika-surge':    'OD-PURI',
  'mh-gopalpur-south':    'OD-PURI',
  'crz-gopalpur-south':   'OD-PURI',

  'mh-mahanadi-delta':    'OD-CUTTACK',
  'rz-mahanadi-delta':    'OD-CUTTACK',

  'mh-bhubaneswar-urban': 'OD-CUTTACK',
  'rz-bhubaneswar-urban': 'OD-CUTTACK',

  'mh-paradip-port':      'OD-KENDRAPARA',
  'crz-paradip-port':     'OD-KENDRAPARA',

  'mh-kendrapara-coast':  'OD-KENDRAPARA',
  'crz-kendrapara-coast': 'OD-KENDRAPARA',

  'mh-visakhapatnam':     'AP-VIZAG',
  'rz-visakha-hills':     'AP-VIZAG',
  'crz-visakha-cyclone':  'AP-VIZAG',

  'mh-godavari-ap':       'AP-GODAVARI',
  'rz-godavari-ap':       'AP-GODAVARI',
};

/** Convert a raw Shelter into a ShelterSummaryItem */
export function toShelterSummaryItem(s: Shelter): ShelterSummaryItem {
  const availableSlots = Math.max(0, s.capacity - s.occupancy);
  const utilizationPct = s.capacity > 0 ? Math.round((s.occupancy / s.capacity) * 100) : 0;
  return {
    id:             s.id,
    name:           s.name,
    capacity:       s.capacity,
    occupancy:      s.occupancy,
    availableSlots,
    utilizationPct,
    status:         s.status,
    hasMedical:     s.hasMedical,
    hasFood:        s.hasFood,
    location:       s.address,
    coordinates:    s.coordinates,
  };
}

export interface BuildShelterPlanningParams {
  zoneId:              string;
  zoneName:            string;
  affectedPopulation:  number;
  severity:            Severity;
  riskScore:           number;
  allShelters:         Shelter[];
  allHistoricalEvents?: HistoricalDisasterEvent[];
}

/**
 * Builds the complete shelter planning result for a given zone by resolving:
 * 1. Assigned shelters for the zone (or nearby fallbacks)
 * 2. Historical average impact from HistoricalDisasterEvent records
 * 3. Computing projected demand, gap, and recommendations
 */
export function buildShelterPlanningForZone({
  zoneId,
  zoneName,
  affectedPopulation,
  severity,
  riskScore,
  allShelters,
  allHistoricalEvents = [],
}: BuildShelterPlanningParams): ShelterPlanningResult {
  // 1. Resolve shelters for this zone
  const targetIds = ZONE_SHELTER_IDS[zoneId];
  let matchedShelters: Shelter[] = [];
  if (targetIds && targetIds.length > 0) {
    matchedShelters = allShelters.filter((s) => targetIds.includes(s.id));
  }
  if (matchedShelters.length === 0) {
    // Fallback: use first 2 shelters or all shelters if fewer
    matchedShelters = allShelters.slice(0, 2);
  }

  const shelterItems = matchedShelters.map(toShelterSummaryItem);

  // 2. Resolve historical context
  const regionCode = ZONE_TO_REGION_CODE[zoneId];
  let historicalAvgAffectedPop = 0;
  if (regionCode && allHistoricalEvents.length > 0) {
    const history = getLocationHistory(allHistoricalEvents, regionCode, zoneName);
    historicalAvgAffectedPop = history.summary.avgAffectedPopulation;
  }

  // 3. Compute requirement
  return calculateShelterRequirement({
    zoneId,
    zoneName,
    affectedPopulation,
    severity,
    riskScore,
    historicalAvgAffectedPop,
    shelters: shelterItems,
  });
}
