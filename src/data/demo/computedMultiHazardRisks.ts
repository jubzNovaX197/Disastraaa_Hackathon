/**
 * DEMO DATA — Pre-computed Multi-Hazard Risk Results
 *
 * ⚠️  PROTOTYPE / DEMO ONLY — Not real risk assessments.
 *
 * Maps a location key → MultiHazardRiskExplanation by combining whichever
 * per-hazard results are available for that location.
 *
 * Key design:
 *  - Some locations have BOTH flood and cyclone data  → full composite.
 *  - Some locations have only one hazard             → single-hazard composite
 *    (data quality = LIMITED, still uses the engine).
 *  - The engine never re-runs individual calculations;
 *    it reads from computedFloodRisks / computedCycloneRisks.
 *
 * Keyed by a canonical location id that matches either a riskZone id,
 * a cycloneZone id, or a shared location slug where both overlap.
 */

import type { MultiHazardRiskExplanation } from '@/lib/risk/multiHazard';
import {
  calculateMultiHazardRisk,
  explainMultiHazardRisk,
} from '@/lib/risk/multiHazard';
import { computedCycloneRisks } from './computedCycloneRisks';
import { computedFloodRisks } from './computedFloodRisks';

/**
 * Location definitions for composite assessment.
 *
 * `floodId`   — key into computedFloodRisks   (optional)
 * `cycloneId` — key into computedCycloneRisks (optional)
 * `population` — representative population for the combined zone
 */
const MULTI_HAZARD_LOCATIONS: Array<{
  id: string;
  floodId?:   string;
  cycloneId?: string;
  population: number;
}> = [
  // Puri coast: BOTH flood (rz-puri-coast) and cyclone (crz-puri-landfall)
  {
    id:        'mh-puri-coast',
    floodId:   'rz-puri-coast',
    cycloneId: 'crz-puri-landfall',
    population: 340000,
  },
  // Mahanadi delta: flood only
  {
    id:       'mh-mahanadi-delta',
    floodId:  'rz-mahanadi-delta',
    population: 410000,
  },
  // Bhubaneswar urban: flood only
  {
    id:       'mh-bhubaneswar-urban',
    floodId:  'rz-bhubaneswar-urban',
    population: 920000,
  },
  // Paradip: cyclone only
  {
    id:        'mh-paradip-port',
    cycloneId: 'crz-paradip-port',
    population: 210000,
  },
  // Kendrapara: cyclone only
  {
    id:        'mh-kendrapara-coast',
    cycloneId: 'crz-kendrapara-coast',
    population: 160000,
  },
  // Visakhapatnam: BOTH flood (rz-visakha-hills) and cyclone (crz-visakha-cyclone)
  {
    id:        'mh-visakhapatnam',
    floodId:   'rz-visakha-hills',
    cycloneId: 'crz-visakha-cyclone',
    population: 580000,
  },
  // Godavari floodplain: flood only
  {
    id:       'mh-godavari-ap',
    floodId:  'rz-godavari-ap',
    population: 340000,
  },
  // Chilika: BOTH flood (rz-chilika-south) and cyclone (crz-chilika-surge)
  {
    id:        'mh-chilika',
    floodId:   'rz-chilika-south',
    cycloneId: 'crz-chilika-surge',
    population: 95000,
  },
  // Gopalpur: cyclone only
  {
    id:        'mh-gopalpur-south',
    cycloneId: 'crz-gopalpur-south',
    population: 88000,
  },
];

export const computedMultiHazardRisks: Record<string, MultiHazardRiskExplanation> =
  Object.fromEntries(
    MULTI_HAZARD_LOCATIONS.map(({ id, floodId, cycloneId, population }) => {
      const flood   = floodId   ? computedFloodRisks[floodId]     : undefined;
      const cyclone = cycloneId ? computedCycloneRisks[cycloneId] : undefined;

      const result = calculateMultiHazardRisk({
        flood,
        cyclone,
        affectedPopulation: population,
      });

      return [id, explainMultiHazardRisk(result)];
    }),
  );

/**
 * Lookup map: individual zone id → multi-hazard location id.
 * Used by the map click handler to find the composite result
 * when a user clicks a flood or cyclone zone polygon.
 */
export const ZONE_TO_MULTI_HAZARD_ID: Record<string, string> = {
  // flood zone ids
  'rz-puri-coast':       'mh-puri-coast',
  'rz-mahanadi-delta':   'mh-mahanadi-delta',
  'rz-bhubaneswar-urban':'mh-bhubaneswar-urban',
  'rz-godavari-ap':      'mh-godavari-ap',
  'rz-visakha-hills':    'mh-visakhapatnam',
  'rz-chilika-south':    'mh-chilika',
  // cyclone zone ids
  'crz-puri-landfall':   'mh-puri-coast',
  'crz-paradip-port':    'mh-paradip-port',
  'crz-kendrapara-coast':'mh-kendrapara-coast',
  'crz-gopalpur-south':  'mh-gopalpur-south',
  'crz-visakha-cyclone': 'mh-visakhapatnam',
  'crz-chilika-surge':   'mh-chilika',
};
