/**
 * Road Intelligence — Display Configurations & Rule Constants
 *
 * ⚠️  PROTOTYPE / DEMO DECISION SUPPORT
 */

import type { Severity } from '@/types';
import type { RoadBlockageType, RoadStatus, RoadType } from './types';

// ── Road Status Visual & Public Guidance Configuration ───────────────────────

export const ROAD_STATUS_CONFIG: Record<
  RoadStatus,
  {
    label: string;
    badge: string;
    color: string;
    bg: string;
    border: string;
    dot: string;
    icon: string;
    publicGuidance: string;
    shortAdvice: string;
  }
> = {
  OPEN: {
    label: 'Open & Passable',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    icon: '✅',
    publicGuidance: 'Road is clear and passable. Normal driving conditions observed.',
    shortAdvice: 'Safe for travel',
  },
  CAUTION: {
    label: 'Caution / Hazardous',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    icon: '⚠️',
    publicGuidance: 'Active hazard warning in sector. Moderate water, wet debris, or reduced visibility. Proceed with caution.',
    shortAdvice: 'Proceed with caution',
  },
  PARTIALLY_BLOCKED: {
    label: 'Partially Blocked',
    badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10 dark:bg-orange-500/15',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
    icon: '🚧',
    publicGuidance: 'One lane or shoulder obstructed. Severe bottlenecks; single-file alternating traffic.',
    shortAdvice: 'Expect severe delays / 4x4 recommended',
  },
  BLOCKED: {
    label: 'Completely Blocked',
    badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
    icon: '🚫',
    publicGuidance: 'Route completely impassable due to physical blockage or deep inundation. Avoid route.',
    shortAdvice: 'Do not travel / Seek alternate route',
  },
  CLOSED: {
    label: 'Officially Closed',
    badge: 'bg-red-700/20 text-red-500 dark:text-red-400 border-red-600/40',
    color: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-700/15 dark:bg-red-900/25',
    border: 'border-red-600/50',
    dot: 'bg-red-600',
    icon: '🛑',
    publicGuidance: 'Barricaded by Police or District Disaster Management Authority. Authorized emergency vehicles only.',
    shortAdvice: 'Barricaded / Closed to public',
  },
  UNKNOWN: {
    label: 'Status Unconfirmed',
    badge: 'bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30',
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    icon: '❓',
    publicGuidance: 'Road conditions currently unconfirmed. Awaiting field reconnaissance reports.',
    shortAdvice: 'Conditions unconfirmed',
  },
};

// ── Blockage Types Visual Configuration ──────────────────────────────────────

export const ROAD_BLOCKAGE_CONFIG: Record<
  RoadBlockageType,
  { label: string; icon: string; description: string }
> = {
  FLOODING: {
    label: 'Floodwater Inundation',
    icon: '🌊',
    description: 'Road submerged under flowing or standing flood waters.',
  },
  DEBRIS: {
    label: 'Fallen Trees & Snapped Cables',
    icon: '🪵',
    description: 'Uprooted vegetation, tree trunks, or live electrical wires on roadway.',
  },
  LANDSLIDE: {
    label: 'Landslide / Rockfall',
    icon: '⛰️',
    description: 'Mass slope failure, boulders, or mud deposits covering road surface.',
  },
  COLLAPSED_ROAD: {
    label: 'Roadbed / Culvert Collapse',
    icon: '💥',
    description: 'Bridge or road foundation structurally washed out or cratered.',
  },
  WATERLOGGING: {
    label: 'Urban Waterlogging',
    icon: '💧',
    description: 'Drainage overflow causing standing water in underpasses and low points.',
  },
  CYCLONE_DAMAGE: {
    label: 'Cyclone Wind Destruction',
    icon: '🌀',
    description: 'Extensive wind destruction, tin sheets, and collapsed light poles.',
  },
  ACCIDENT: {
    label: 'Vehicle Collision',
    icon: '🚗',
    description: 'Stranded heavy vehicles or multi-vehicle collision blocking traffic.',
  },
  INFRASTRUCTURE_DAMAGE: {
    label: 'Bridge / Structure Damage',
    icon: '🏗️',
    description: 'Pier vibration, visible cracks, or structural integrity compromise.',
  },
  UNKNOWN: {
    label: 'General Obstruction',
    icon: '⚠️',
    description: 'Physical barrier or hazardous obstacle reported on route.',
  },
};

// ── Road Type Configuration ──────────────────────────────────────────────────

export const ROAD_TYPE_CONFIG: Record<
  RoadType,
  { label: string; icon: string; capacityDesc: string }
> = {
  HIGHWAY: {
    label: 'National / State Expressway',
    icon: '🛣️',
    capacityDesc: 'High-speed multi-lane critical logistics & evacuation arterial',
  },
  MAJOR_ROAD: {
    label: 'State Highway / Trunk Corridor',
    icon: '🚙',
    capacityDesc: 'Two-lane arterial connecting major urban and coastal sub-divisions',
  },
  DISTRICT_ROAD: {
    label: 'Major District Road (MDR)',
    icon: '🚗',
    capacityDesc: 'Collector road connecting tehsil headquarters and community shelters',
  },
  LOCAL_ROAD: {
    label: 'Urban / Municipal Street',
    icon: '🏘️',
    capacityDesc: 'Neighborhood street providing local access to hospitals and wards',
  },
  VILLAGE_ROAD: {
    label: 'Rural / Embankment Bund Road',
    icon: '🚜',
    capacityDesc: 'Single-lane unpaved or canal bund route; high vulnerability to washouts',
  },
};

// ── Road Travel Risk Thresholds ──────────────────────────────────────────────

export function getRoadRiskSeverity(score: number): Severity {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}
