/**
 * DEMO DATA — Disaster Response Resource Inventories
 *
 * ⚠️  SIMULATED DATA ONLY. Not official government inventory.
 * Represents demo stockpiles and standby assets available at district depots,
 * NDRF battalions, ODRAF centers, and civil protection reserves in Odisha & Andhra Pradesh.
 */

import type { ZoneResourceInventory } from '@/lib/planning/resources/types';

export const DEMO_ZONE_INVENTORIES: Record<string, ZoneResourceInventory> = {
  // ── Puri Coastal Belt & Cyclone Landfall ────────────────────────────────────
  'mh-puri-coast': {
    shelterCapacity:   3200,   // Coastal cyclone shelters + schools
    foodMeals:         18500,  // Civil supplies dry ration packs
    waterLiters:       28000,  // Mobile water tanker capacity + packaged water
    medicalTeams:      6,      // Puri DHH + mobile medical units
    rescueTeams:       8,      // ODRAF 2nd Bn + NDRF teams
    emergencyVehicles: 14,     // Ambulances, utility trucks
    rescueBoats:       18,     // Inflatables & country boats stationed near coast
    emergencyKits:     3800,   // Tarpaulin & hygiene family packs
  },
  'rz-puri-coast': {
    shelterCapacity:   3200,
    foodMeals:         18500,
    waterLiters:       28000,
    medicalTeams:      6,
    rescueTeams:       8,
    emergencyVehicles: 14,
    rescueBoats:       18,
    emergencyKits:     3800,
  },
  'crz-puri-landfall': {
    shelterCapacity:   3200,
    foodMeals:         16000,
    waterLiters:       24000,
    medicalTeams:      5,
    rescueTeams:       9,
    emergencyVehicles: 12,
    rescueBoats:       15,
    emergencyKits:     3500,
  },

  // ── Mahanadi Delta & Cuttack ────────────────────────────────────────────────
  'mh-mahanadi-delta': {
    shelterCapacity:   4500,   // High-ground flood shelters
    foodMeals:         32000,  // Cuttack state central warehouse
    waterLiters:       42000,  // Water treatment tankers & storage
    medicalTeams:      10,     // SCB Medical College teams
    rescueTeams:       12,     // NDRF 3rd Bn Cuttack + ODRAF
    emergencyVehicles: 22,     // Logistics haulers & ambulances
    rescueBoats:       28,     // Heavy flood rescue motorboats
    emergencyKits:     6200,   // Flood relief packets
  },
  'rz-mahanadi-delta': {
    shelterCapacity:   4500,
    foodMeals:         32000,
    waterLiters:       42000,
    medicalTeams:      10,
    rescueTeams:       12,
    emergencyVehicles: 22,
    rescueBoats:       28,
    emergencyKits:     6200,
  },

  // ── Bhubaneswar Urban Hub ───────────────────────────────────────────────────
  'mh-bhubaneswar-urban': {
    shelterCapacity:   5500,   // Indoor stadiums & educational campuses
    foodMeals:         45000,  // Urban relief reserves & central kitchens
    waterLiters:       65000,  // Municipal tanker fleet
    medicalTeams:      16,     // AIIMS + Capital Hospital doctors
    rescueTeams:       10,     // Fire & Emergency Services + ODRAF
    emergencyVehicles: 30,     // High mobility ambulances & logistics trucks
    rescueBoats:       8,      // Urban flood dewatering & dinghies
    emergencyKits:     8000,   // Standard relief kits
  },
  'rz-bhubaneswar-urban': {
    shelterCapacity:   5500,
    foodMeals:         45000,
    waterLiters:       65000,
    medicalTeams:      16,
    rescueTeams:       10,
    emergencyVehicles: 30,
    rescueBoats:       8,
    emergencyKits:     8000,
  },

  // ── Paradip Port & Kendrapara Coast ─────────────────────────────────────────
  'mh-paradip-port': {
    shelterCapacity:   2800,   // Port community centers & cyclone shelters
    foodMeals:         14000,  // Port civil supplies
    waterLiters:       22000,  // Desalination & port storage
    medicalTeams:      5,      // Port trust hospital & mobile units
    rescueTeams:       7,      // CISF / Coast Guard / ODRAF
    emergencyVehicles: 10,     // Port heavy transport & ambulances
    rescueBoats:       20,     // Tugboats, coastal launches, rafts
    emergencyKits:     2900,   // Cyclone kits
  },
  'crz-paradip-port': {
    shelterCapacity:   2800,
    foodMeals:         14000,
    waterLiters:       22000,
    medicalTeams:      5,
    rescueTeams:       7,
    emergencyVehicles: 10,
    rescueBoats:       20,
    emergencyKits:     2900,
  },
  'mh-kendrapara-coast': {
    shelterCapacity:   2400,
    foodMeals:         12000,
    waterLiters:       19000,
    medicalTeams:      4,
    rescueTeams:       6,
    emergencyVehicles: 8,
    rescueBoats:       22,     // Mangrove & estuarine boats
    emergencyKits:     2500,
  },
  'crz-kendrapara-coast': {
    shelterCapacity:   2400,
    foodMeals:         12000,
    waterLiters:       19000,
    medicalTeams:      4,
    rescueTeams:       6,
    emergencyVehicles: 8,
    rescueBoats:       22,
    emergencyKits:     2500,
  },

  // ── Chilika Lagoon & Gopalpur ───────────────────────────────────────────────
  'mh-chilika': {
    shelterCapacity:   1800,
    foodMeals:         9500,
    waterLiters:       15000,
    medicalTeams:      3,
    rescueTeams:       5,
    emergencyVehicles: 7,
    rescueBoats:       24,     // Lake & fisheries rescue boats
    emergencyKits:     2000,
  },
  'rz-chilika-south': {
    shelterCapacity:   1800,
    foodMeals:         9500,
    waterLiters:       15000,
    medicalTeams:      3,
    rescueTeams:       5,
    emergencyVehicles: 7,
    rescueBoats:       24,
    emergencyKits:     2000,
  },
  'crz-chilika-surge': {
    shelterCapacity:   1800,
    foodMeals:         9500,
    waterLiters:       15000,
    medicalTeams:      3,
    rescueTeams:       5,
    emergencyVehicles: 7,
    rescueBoats:       24,
    emergencyKits:     2000,
  },
  'mh-gopalpur-south': {
    shelterCapacity:   1600,
    foodMeals:         8000,
    waterLiters:       12000,
    medicalTeams:      3,
    rescueTeams:       4,
    emergencyVehicles: 6,
    rescueBoats:       10,
    emergencyKits:     1700,
  },
  'crz-gopalpur-south': {
    shelterCapacity:   1600,
    foodMeals:         8000,
    waterLiters:       12000,
    medicalTeams:      3,
    rescueTeams:       4,
    emergencyVehicles: 6,
    rescueBoats:       10,
    emergencyKits:     1700,
  },

  // ── Visakhapatnam & AP Coast ────────────────────────────────────────────────
  'mh-visakhapatnam': {
    shelterCapacity:   5000,
    foodMeals:         40000,
    waterLiters:       55000,
    medicalTeams:      14,     // King George Hospital + Naval Hospital
    rescueTeams:       12,     // NDRF 10th Bn + Eastern Naval Command
    emergencyVehicles: 25,
    rescueBoats:       20,
    emergencyKits:     7000,
  },
  'rz-visakha-hills': {
    shelterCapacity:   5000,
    foodMeals:         40000,
    waterLiters:       55000,
    medicalTeams:      14,
    rescueTeams:       12,
    emergencyVehicles: 25,
    rescueBoats:       20,
    emergencyKits:     7000,
  },
  'crz-visakha-cyclone': {
    shelterCapacity:   5000,
    foodMeals:         40000,
    waterLiters:       55000,
    medicalTeams:      14,
    rescueTeams:       12,
    emergencyVehicles: 25,
    rescueBoats:       20,
    emergencyKits:     7000,
  },

  // ── Godavari Floodplain ─────────────────────────────────────────────────────
  'mh-godavari-ap': {
    shelterCapacity:   3000,
    foodMeals:         22000,
    waterLiters:       30000,
    medicalTeams:      6,
    rescueTeams:       8,
    emergencyVehicles: 12,
    rescueBoats:       25,     // Riverine flood rescue units
    emergencyKits:     4500,
  },
  'rz-godavari-ap': {
    shelterCapacity:   3000,
    foodMeals:         22000,
    waterLiters:       30000,
    medicalTeams:      6,
    rescueTeams:       8,
    emergencyVehicles: 12,
    rescueBoats:       25,
    emergencyKits:     4500,
  },
};

/**
 * Fallback generator when a zone ID has no pre-defined stock.
 * Scales inventory sensibly based on estimated affected population.
 */
export function generateFallbackInventory(affectedPopulation: number): ZoneResourceInventory {
  const pop = Math.max(affectedPopulation, 2000);
  return {
    shelterCapacity:   Math.round(pop * 0.12),
    foodMeals:         Math.round(pop * 0.8),
    waterLiters:       Math.round(pop * 1.5),
    medicalTeams:      Math.max(2, Math.round(pop / 4000)),
    rescueTeams:       Math.max(2, Math.round(pop / 3000)),
    emergencyVehicles: Math.max(4, Math.round(pop / 1500)),
    rescueBoats:       Math.max(3, Math.round(pop / 2500)),
    emergencyKits:     Math.round(pop / 5),
  };
}

/**
 * Resolve inventory for any zone ID, falling back dynamically if unmapped.
 */
export function getZoneResourceInventory(zoneId: string, affectedPopulation: number): ZoneResourceInventory {
  return DEMO_ZONE_INVENTORIES[zoneId] ?? generateFallbackInventory(affectedPopulation);
}
