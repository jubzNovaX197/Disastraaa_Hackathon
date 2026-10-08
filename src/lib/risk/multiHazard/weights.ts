/**
 * Multi-Hazard Risk Engine — Hazard Weights
 *
 * ⚠️  PROTOTYPE WEIGHTS ONLY — not calibrated to real scientific models.
 *
 * When multiple hazards are active simultaneously, these weights determine
 * each hazard's share of the composite score.
 *
 * Extend this record when a new hazard engine (heatwave, landslide, etc.)
 * is added. Weights are normalised at calculation time so they do NOT need
 * to sum to 1 — add a new entry and the engine self-balances.
 */

import type { HazardType } from '@/types';

/** Relative importance of each hazard in a multi-hazard composite. */
export const MULTI_HAZARD_WEIGHTS: Partial<Record<HazardType, number>> = {
  CYCLONE:     1.0, // highest impact potential on Indian coast
  FLOOD:       0.85,
  STORM_SURGE: 0.75,
  LANDSLIDE:   0.60,
  HEATWAVE:    0.50,
  LIGHTNING:   0.35,
  DROUGHT:     0.30,
};
