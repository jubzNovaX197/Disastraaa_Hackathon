/**
 * Resource Requirement Planning Engine
 *
 * ⚠️  PROTOTYPE / DEMO ONLY.
 * Deterministic decision-support calculation model.
 * NOT official government disaster-relief standards.
 *
 * All formulas are fully explainable, transparent, and reproducible.
 */

import { getZoneResourceInventory } from '@/data/demo/resources';
import {
  ASSISTANCE_FRACTION,
  BASE_RATES,
  DEFAULT_HAZARD_MULTIPLIERS,
  deriveResourceStatus,
  HAZARD_MULTIPLIERS,
} from './rules';
import type {
  ResourcePlanningInputs,
  ResourcePlanningResult,
  ResourcePrioritySummary,
  ResourceRecommendation,
  ResourceRequirementItem,
  ResourceStatus,
  ZoneResourceInventory
} from './types';

// ── Historical adjustment helper ──────────────────────────────────────────────

function calculateHistoricalMultiplier(
  affectedPopulation: number,
  historicalAvgAffectedPop?: number,
): number {
  if (!historicalAvgAffectedPop || historicalAvgAffectedPop <= 0) return 1.0;
  const ratio = historicalAvgAffectedPop / Math.max(affectedPopulation, 1);
  // Modest dampening/boosting between 0.85 and 1.25
  return Math.min(Math.max(0.85 + ratio * 0.15, 0.85), 1.25);
}

// ── Helper: Format Numbers ───────────────────────────────────────────────────

function fmtNum(n: number): string {
  return n.toLocaleString('en-IN');
}

// ── Main Engine Function ──────────────────────────────────────────────────────

export function calculateResourceRequirement(
  inputs: ResourcePlanningInputs,
): ResourcePlanningResult {
  const {
    zoneId,
    zoneName,
    dominantHazard,
    riskScore,
    severity,
    affectedPopulation,
    buildingsAffected = 0,
    roadsAffectedKm = 0,
    hospitalsAffected = 0,
    shelterAvailableSlots,
    historicalAvgAffectedPop = 0,
    inventory: customInventory,
  } = inputs;

  // 1. Resolve local stockpile inventory
  const inventory: ZoneResourceInventory =
    customInventory ?? getZoneResourceInventory(zoneId, affectedPopulation);

  // 2. Derive Estimated Population Requiring Assistance
  const baseAssistanceFrac = ASSISTANCE_FRACTION[severity] ?? 0.30;
  const scoreMicro = 0.90 + (riskScore / 100) * 0.20; // 0.90 to 1.10
  const histMultiplier = calculateHistoricalMultiplier(affectedPopulation, historicalAvgAffectedPop);

  const rawAssistancePop =
    affectedPopulation * baseAssistanceFrac * scoreMicro * histMultiplier;
  const estimatedAssistancePopulation =
    affectedPopulation > 0 ? Math.max(1, Math.round(rawAssistancePop)) : 0;

  // 3. Resolve Hazard Multipliers
  const hazardMultMap = HAZARD_MULTIPLIERS[dominantHazard] ?? DEFAULT_HAZARD_MULTIPLIERS;

  // 4. Calculate Individual Resources
  const resources: ResourceRequirementItem[] = [];

  // ── A. Emergency Shelter Capacity ──────────────────────────────────────────
  {
    const mult = hazardMultMap.SHELTER;
    const req = Math.round(
      estimatedAssistancePopulation * BASE_RATES.SHELTER_EVACUATION_FRACTION * mult,
    );
    // Prefer shelterAvailableSlots from Task 7 shelter engine if provided
    const avail = shelterAvailableSlots !== undefined ? shelterAvailableSlots : inventory.shelterCapacity;
    const gap = Math.max(0, req - avail);
    const surplus = Math.max(0, avail - req);
    const coveragePct = req === 0 ? 100 : Math.round((avail / req) * 100);
    const shortagePct = req === 0 ? 0 : Math.max(0, Math.round(((req - avail) / req) * 100));

    resources.push({
      id: 'shelter',
      name: 'Emergency Shelter Capacity',
      category: 'SHELTER',
      icon: '⛺',
      required: req,
      available: avail,
      gap,
      surplus,
      coveragePct,
      shortagePct,
      status: deriveResourceStatus(coveragePct),
      unit: 'spaces',
      hazardMultiplier: mult,
      calculationBasis: `${Math.round(BASE_RATES.SHELTER_EVACUATION_FRACTION * 100)}% of assisted pop × ${mult.toFixed(2)} (${dominantHazard} shelter factor)`,
    });
  }

  // ── B. Food / Meal Support ─────────────────────────────────────────────────
  {
    const mult = hazardMultMap.FOOD;
    const req = Math.round(
      estimatedAssistancePopulation * BASE_RATES.MEALS_PER_PERSON_DAY * mult,
    );
    const avail = inventory.foodMeals;
    const gap = Math.max(0, req - avail);
    const surplus = Math.max(0, avail - req);
    const coveragePct = req === 0 ? 100 : Math.round((avail / req) * 100);
    const shortagePct = req === 0 ? 0 : Math.max(0, Math.round(((req - avail) / req) * 100));

    resources.push({
      id: 'food',
      name: 'Emergency Food Support',
      category: 'FOOD',
      icon: '🍲',
      required: req,
      available: avail,
      gap,
      surplus,
      coveragePct,
      shortagePct,
      status: deriveResourceStatus(coveragePct),
      unit: 'meals/day',
      hazardMultiplier: mult,
      calculationBasis: `${BASE_RATES.MEALS_PER_PERSON_DAY} meals/day × ${mult.toFixed(2)} (${dominantHazard} food factor)`,
    });
  }

  // ── C. Potable Drinking Water ──────────────────────────────────────────────
  {
    const mult = hazardMultMap.WATER;
    const req = Math.round(
      estimatedAssistancePopulation * BASE_RATES.WATER_LITERS_PER_PERSON_DAY * mult,
    );
    const avail = inventory.waterLiters;
    const gap = Math.max(0, req - avail);
    const surplus = Math.max(0, avail - req);
    const coveragePct = req === 0 ? 100 : Math.round((avail / req) * 100);
    const shortagePct = req === 0 ? 0 : Math.max(0, Math.round(((req - avail) / req) * 100));

    resources.push({
      id: 'water',
      name: 'Drinking Water Supply',
      category: 'WATER',
      icon: '💧',
      required: req,
      available: avail,
      gap,
      surplus,
      coveragePct,
      shortagePct,
      status: deriveResourceStatus(coveragePct),
      unit: 'liters/day',
      hazardMultiplier: mult,
      calculationBasis: `${BASE_RATES.WATER_LITERS_PER_PERSON_DAY}L/person/day × ${mult.toFixed(2)} (${dominantHazard} water factor)`,
    });
  }

  // ── D. Medical Support ─────────────────────────────────────────────────────
  {
    const mult = hazardMultMap.MEDICAL;
    const baseReq = estimatedAssistancePopulation / BASE_RATES.PERSONS_PER_MEDICAL_TEAM;
    const hospitalImpactBoost = hospitalsAffected > 0 ? hospitalsAffected * 0.5 : 0;
    const req = estimatedAssistancePopulation > 0
      ? Math.max(1, Math.ceil((baseReq + hospitalImpactBoost) * mult))
      : 0;
    const avail = inventory.medicalTeams;
    const gap = Math.max(0, req - avail);
    const surplus = Math.max(0, avail - req);
    const coveragePct = req === 0 ? 100 : Math.round((avail / req) * 100);
    const shortagePct = req === 0 ? 0 : Math.max(0, Math.round(((req - avail) / req) * 100));

    resources.push({
      id: 'medical',
      name: 'Medical Support Teams',
      category: 'MEDICAL',
      icon: '🩺',
      required: req,
      available: avail,
      gap,
      surplus,
      coveragePct,
      shortagePct,
      status: deriveResourceStatus(coveragePct),
      unit: 'teams',
      hazardMultiplier: mult,
      calculationBasis: `1 team per ${fmtNum(BASE_RATES.PERSONS_PER_MEDICAL_TEAM)} assisted pop × ${mult.toFixed(2)} (${dominantHazard} medical factor)${hospitalsAffected > 0 ? ` + hospital impact` : ''}`,
    });
  }

  // ── E. Rescue Teams (NDRF/SDRF) ─────────────────────────────────────────────
  {
    const mult = hazardMultMap.RESCUE;
    const baseReq = estimatedAssistancePopulation / BASE_RATES.PERSONS_PER_RESCUE_TEAM;
    const roadImpactBoost = roadsAffectedKm > 10 ? Math.ceil(roadsAffectedKm / 20) : 0;
    const req = estimatedAssistancePopulation > 0
      ? Math.max(1, Math.ceil((baseReq + roadImpactBoost) * mult))
      : 0;
    const avail = inventory.rescueTeams;
    const gap = Math.max(0, req - avail);
    const surplus = Math.max(0, avail - req);
    const coveragePct = req === 0 ? 100 : Math.round((avail / req) * 100);
    const shortagePct = req === 0 ? 0 : Math.max(0, Math.round(((req - avail) / req) * 100));

    resources.push({
      id: 'rescue',
      name: 'Rescue Teams (NDRF/SDRF)',
      category: 'RESCUE',
      icon: '🦺',
      required: req,
      available: avail,
      gap,
      surplus,
      coveragePct,
      shortagePct,
      status: deriveResourceStatus(coveragePct),
      unit: 'teams',
      hazardMultiplier: mult,
      calculationBasis: `1 team per ${fmtNum(BASE_RATES.PERSONS_PER_RESCUE_TEAM)} assisted pop × ${mult.toFixed(2)} (${dominantHazard} rescue factor)${roadsAffectedKm > 10 ? ` + road cutoff factor` : ''}`,
    });
  }

  // ── F. Emergency Vehicles ──────────────────────────────────────────────────
  {
    const mult = hazardMultMap.VEHICLES;
    const baseReq = estimatedAssistancePopulation / BASE_RATES.PERSONS_PER_VEHICLE;
    const req = estimatedAssistancePopulation > 0
      ? Math.max(2, Math.ceil(baseReq * mult))
      : 0;
    const avail = inventory.emergencyVehicles;
    const gap = Math.max(0, req - avail);
    const surplus = Math.max(0, avail - req);
    const coveragePct = req === 0 ? 100 : Math.round((avail / req) * 100);
    const shortagePct = req === 0 ? 0 : Math.max(0, Math.round(((req - avail) / req) * 100));

    resources.push({
      id: 'vehicles',
      name: 'Emergency Vehicles & Trucks',
      category: 'VEHICLES',
      icon: '🚒',
      required: req,
      available: avail,
      gap,
      surplus,
      coveragePct,
      shortagePct,
      status: deriveResourceStatus(coveragePct),
      unit: 'vehicles',
      hazardMultiplier: mult,
      calculationBasis: `1 vehicle per ${fmtNum(BASE_RATES.PERSONS_PER_VEHICLE)} assisted pop × ${mult.toFixed(2)} (${dominantHazard} logistics factor)`,
    });
  }

  // ── G. Boats / Water Rescue Units ──────────────────────────────────────────
  {
    const mult = hazardMultMap.BOATS;
    const baseReq = estimatedAssistancePopulation / BASE_RATES.PERSONS_PER_BOAT;
    // Boats are heavily required in flood or cyclone surge
    const req = estimatedAssistancePopulation > 0
      ? Math.max(dominantHazard === 'FLOOD' ? 3 : 1, Math.ceil(baseReq * mult))
      : 0;
    const avail = inventory.rescueBoats;
    const gap = Math.max(0, req - avail);
    const surplus = Math.max(0, avail - req);
    const coveragePct = req === 0 ? 100 : Math.round((avail / req) * 100);
    const shortagePct = req === 0 ? 0 : Math.max(0, Math.round(((req - avail) / req) * 100));

    resources.push({
      id: 'boats',
      name: 'Boats / Water Rescue Units',
      category: 'BOATS',
      icon: '🚤',
      required: req,
      available: avail,
      gap,
      surplus,
      coveragePct,
      shortagePct,
      status: deriveResourceStatus(coveragePct),
      unit: 'boats',
      hazardMultiplier: mult,
      calculationBasis: `1 boat per ${fmtNum(BASE_RATES.PERSONS_PER_BOAT)} assisted pop × ${mult.toFixed(2)} (${dominantHazard} aquatic rescue factor)`,
    });
  }

  // ── H. Emergency Kits (Family Relief Packs) ────────────────────────────────
  {
    const mult = hazardMultMap.KITS;
    const baseReq = estimatedAssistancePopulation / BASE_RATES.PERSONS_PER_EMERGENCY_KIT;
    const buildingImpactBoost = buildingsAffected > 0 ? buildingsAffected * 0.15 : 0;
    const req = estimatedAssistancePopulation > 0
      ? Math.max(1, Math.ceil((baseReq + buildingImpactBoost) * mult))
      : 0;
    const avail = inventory.emergencyKits;
    const gap = Math.max(0, req - avail);
    const surplus = Math.max(0, avail - req);
    const coveragePct = req === 0 ? 100 : Math.round((avail / req) * 100);
    const shortagePct = req === 0 ? 0 : Math.max(0, Math.round(((req - avail) / req) * 100));

    resources.push({
      id: 'kits',
      name: 'Emergency Relief Kits',
      category: 'KITS',
      icon: '📦',
      required: req,
      available: avail,
      gap,
      surplus,
      coveragePct,
      shortagePct,
      status: deriveResourceStatus(coveragePct),
      unit: 'family kits',
      hazardMultiplier: mult,
      calculationBasis: `1 kit per ${BASE_RATES.PERSONS_PER_EMERGENCY_KIT} persons × ${mult.toFixed(2)} (${dominantHazard} shelter-in-place factor)${buildingsAffected > 0 ? ` + structural damage factor` : ''}`,
    });
  }

  // 5. Categorize by Priority
  const prioritySummary: ResourcePrioritySummary = {
    criticalShortages: resources.filter((r) => r.status === 'CRITICAL_SHORTAGE'),
    majorShortages:    resources.filter((r) => r.status === 'SHORTAGE'),
    nearCapacity:      resources.filter((r) => r.status === 'NEAR_CAPACITY'),
    sufficient:        resources.filter((r) => r.status === 'SUFFICIENT'),
  };

  // 6. Overall Status
  let overallStatus: ResourceStatus = 'SUFFICIENT';
  if (prioritySummary.criticalShortages.length > 0) {
    overallStatus = 'CRITICAL_SHORTAGE';
  } else if (prioritySummary.majorShortages.length > 0) {
    overallStatus = 'SHORTAGE';
  } else if (prioritySummary.nearCapacity.length > 0) {
    overallStatus = 'NEAR_CAPACITY';
  }

  // 7. Deterministic Recommendations Generator
  const recommendations: ResourceRecommendation[] = [];

  // Boat recommendation
  const boatItem = resources.find((r) => r.category === 'BOATS');
  if (boatItem && (boatItem.status === 'CRITICAL_SHORTAGE' || boatItem.status === 'SHORTAGE')) {
    recommendations.push({
      id: 'rec-boats',
      priority: boatItem.status === 'CRITICAL_SHORTAGE' ? 'CRITICAL' : 'HIGH',
      category: 'BOATS',
      title: 'Deploy Water Rescue Units',
      action: `Deploy ~${fmtNum(boatItem.gap)} additional motorized rescue boats and inflatable rafts.`,
      rationale: `${dominantHazard} scenario creates acute waterlogging and access cutoff; existing boat inventory (${fmtNum(boatItem.available)}) is under heavy strain (${boatItem.coveragePct}% coverage).`,
    });
  }

  // Shelter recommendation
  const shelterItem = resources.find((r) => r.category === 'SHELTER');
  if (shelterItem && (shelterItem.status === 'CRITICAL_SHORTAGE' || shelterItem.status === 'SHORTAGE')) {
    recommendations.push({
      id: 'rec-shelter',
      priority: shelterItem.status === 'CRITICAL_SHORTAGE' ? 'CRITICAL' : 'HIGH',
      category: 'SHELTER',
      title: 'Increase Temporary Shelter Capacity',
      action: `Activate public buildings, schools, and community centers to add ~${fmtNum(shelterItem.gap)} shelter spaces.`,
      rationale: `High displaced population (${fmtNum(estimatedAssistancePopulation)} assisted) exceeds designated cyclone/flood shelter capacity.`,
    });
  }

  // Water recommendation
  const waterItem = resources.find((r) => r.category === 'WATER');
  if (waterItem && (waterItem.status === 'CRITICAL_SHORTAGE' || waterItem.status === 'SHORTAGE')) {
    recommendations.push({
      id: 'rec-water',
      priority: waterItem.status === 'CRITICAL_SHORTAGE' ? 'CRITICAL' : 'HIGH',
      category: 'WATER',
      title: 'Move Emergency Water Stock to This Location',
      action: `Mobilize water bowsers and mobile water purification units to deliver ~${fmtNum(waterItem.gap)} L/day.`,
      rationale: `Contamination or power grid disruption threatens potable supply; deficit of ${fmtNum(waterItem.gap)} L/day must be bridged immediately.`,
    });
  }

  // Medical recommendation
  const medItem = resources.find((r) => r.category === 'MEDICAL');
  if (medItem && (medItem.status === 'CRITICAL_SHORTAGE' || medItem.status === 'SHORTAGE')) {
    recommendations.push({
      id: 'rec-medical',
      priority: medItem.status === 'CRITICAL_SHORTAGE' ? 'CRITICAL' : 'HIGH',
      category: 'MEDICAL',
      title: 'Dispatch Additional Medical Support',
      action: `Dispatch ~${fmtNum(medItem.gap)} mobile emergency medical teams with trauma & emergency aid kits.`,
      rationale: `Expected casualties, water-borne infection risks, and stress on local clinics require outside medical deployment.`,
    });
  }

  // Rescue teams recommendation
  const rescueItem = resources.find((r) => r.category === 'RESCUE');
  if (rescueItem && (rescueItem.status === 'CRITICAL_SHORTAGE' || rescueItem.status === 'SHORTAGE')) {
    recommendations.push({
      id: 'rec-rescue',
      priority: rescueItem.status === 'CRITICAL_SHORTAGE' ? 'CRITICAL' : 'HIGH',
      category: 'RESCUE',
      title: 'Deploy Additional Rescue Teams',
      action: `Requisition ~${fmtNum(rescueItem.gap)} NDRF/ODRAF platoons for emergency evacuation and debris clearance.`,
      rationale: `Local first responders are overstretched across ${zoneName}; specialized teams needed for high-risk zones.`,
    });
  }

  // Food recommendation
  const foodItem = resources.find((r) => r.category === 'FOOD');
  if (foodItem && (foodItem.status === 'CRITICAL_SHORTAGE' || foodItem.status === 'SHORTAGE')) {
    recommendations.push({
      id: 'rec-food',
      priority: foodItem.status === 'CRITICAL_SHORTAGE' ? 'CRITICAL' : 'HIGH',
      category: 'FOOD',
      title: 'Mobilize Emergency Food Distribution',
      action: `Set up centralized relief kitchens and dispatch ~${fmtNum(foodItem.gap)} daily dry ration packets.`,
      rationale: `Local market disruptions and household displacement necessitate direct cooked meal and ration distribution.`,
    });
  }

  // Emergency vehicles recommendation
  const vehicleItem = resources.find((r) => r.category === 'VEHICLES');
  if (vehicleItem && (vehicleItem.status === 'CRITICAL_SHORTAGE' || vehicleItem.status === 'SHORTAGE')) {
    recommendations.push({
      id: 'rec-vehicles',
      priority: 'MEDIUM',
      category: 'VEHICLES',
      title: 'Requisition Emergency Transport Fleet',
      action: `Requisition ~${fmtNum(vehicleItem.gap)} high-clearance 4x4 vehicles and transport trucks from nearby districts.`,
      rationale: `Logistics supply corridors and ambulance transfers require additional vehicular capacity.`,
    });
  }

  // Emergency kits recommendation
  const kitItem = resources.find((r) => r.category === 'KITS');
  if (kitItem && (kitItem.status === 'CRITICAL_SHORTAGE' || kitItem.status === 'SHORTAGE')) {
    recommendations.push({
      id: 'rec-kits',
      priority: 'MEDIUM',
      category: 'KITS',
      title: 'Expedite Family Relief Kits',
      action: `Distribute ~${fmtNum(kitItem.gap)} emergency kits (tarpaulins, chlorine tablets, solar torches).`,
      rationale: `Assists home sheltering and displaced families waiting for shelter admission.`,
    });
  }

  // If no critical/major shortage exists
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec-standby',
      priority: 'INFO',
      category: 'SHELTER',
      title: 'Maintain Standby Alert Status',
      action: 'Keep local inventories on high alert and monitor distribution channels.',
      rationale: `Current district inventory meets or nears prototype demand estimates for ${zoneName}.`,
    });
  }

  // 8. Explicit Prototype Assumptions
  const assumptions = [
    `Assistance population rate: ${Math.round(baseAssistanceFrac * 100)}% of affected population (${severity} severity).`,
    `Risk score micro-adjustment: ×${scoreMicro.toFixed(2)} (composite score ${riskScore}/100).`,
    `Consumption benchmarks: ${BASE_RATES.MEALS_PER_PERSON_DAY} meals/day and ${BASE_RATES.WATER_LITERS_PER_PERSON_DAY} L potable water/day per assisted person.`,
    `Dominant hazard weighting (${dominantHazard}): tailored multipliers applied (e.g. Boats ×${hazardMultMap.BOATS.toFixed(2)}, Shelter ×${hazardMultMap.SHELTER.toFixed(2)}).`,
    `Inventory baseline: retrieved from district depot demo data for ${zoneName}.`,
    '⚠️ All calculations are deterministic decision-support prototypes — NOT certified government evacuation or relief standards.',
  ];

  // 9. Historical Note
  let historicalNote = '';
  if (historicalAvgAffectedPop > 0) {
    const dir = histMultiplier >= 1.05 ? 'upward' : histMultiplier <= 0.95 ? 'downward' : 'neutral';
    historicalNote = `Historical event average of ~${fmtNum(historicalAvgAffectedPop)} affected in this region applied a ${dir} weighting (×${histMultiplier.toFixed(2)}) to demand estimates.`;
  }

  return {
    zoneId,
    zoneName,
    dominantHazard,
    riskScore,
    severity,
    affectedPopulation,
    estimatedAssistancePopulation,
    resources,
    prioritySummary,
    overallStatus,
    recommendations,
    assumptions,
    historicalNote,
    calculatedAt: new Date().toISOString(),
  };
}
