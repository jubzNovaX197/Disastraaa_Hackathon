/**
 * Time-Aware Risk Scenario Provider
 *
 * ⚠️  PROTOTYPE SCENARIO / DEMO FORECAST DATA ONLY.
 *     Do NOT cite as a real emergency broadcast or official IMD weather forecast.
 *
 * Provides structured, deterministic environmental conditions (rainfall, wind,
 * river levels, surge, active alerts, road modifications) for time-aware
 * destination safety and route risk calculation.
 *
 * Easily swappable with live weather/river APIs (Open-Meteo, IMD, CWC)
 * by implementing the `RiskScenarioProvider` interface.
 */

import type {
  RiskScenarioProvider,
  ScenarioSlotKey,
  TimeRiskScenario,
} from './types';

// Helper to format dates consistently
function getDateString(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const TODAY_STR = getDateString(0);
const TOMORROW_STR = getDateString(1);
const FUTURE_STR = getDateString(2);

export const DEMO_SCENARIOS: Record<ScenarioSlotKey, TimeRiskScenario> = {
  NOW: {
    id: 'scenario-now',
    label: 'Now (Current Simulation)',
    timeSlotName: 'Now',
    targetDate: TODAY_STR,
    targetTime: '13:00',
    slotKey: 'NOW',
    rainfallIntensityMmH: 18,
    riverLevelMeters: 1.2,
    cycloneWindKmh: 42,
    stormSurgeMeters: 0.3,
    scenarioSummary:
      'Moderate squalls approaching coastal belt; intermittent showers and rising drain levels across low-lying districts.',
    activeAlertIds: ['al-lightning-bhubaneswar', 'al-flood-cuttack', 'al-surge-puri'],
    hazardMultipliers: { flood: 1.0, cyclone: 1.0 },
    roadModifications: {
      'rd-nh16-cuttack': {
        status: 'PARTIALLY_BLOCKED',
        delayMinutes: 35,
        hazardNote: 'Water overflow on southbound shoulder (~0.2m)',
      },
    },
  },

  TODAY_12: {
    id: 'scenario-today-12',
    label: 'Today 12:00 (Pre-Landfall Rainbands)',
    timeSlotName: '12:00',
    targetDate: TODAY_STR,
    targetTime: '12:00',
    slotKey: 'TODAY_12',
    rainfallIntensityMmH: 28,
    riverLevelMeters: 1.8,
    cycloneWindKmh: 65,
    stormSurgeMeters: 0.8,
    scenarioSummary:
      'Strengthening coastal rainbands; sea conditions rough; traffic speed reductions on NH-16 corridor.',
    activeAlertIds: ['al-cyclone-puri', 'al-surge-puri', 'al-flood-cuttack'],
    hazardMultipliers: { flood: 1.15, cyclone: 1.2 },
    roadModifications: {
      'rd-nh16-cuttack': {
        status: 'PARTIALLY_BLOCKED',
        delayMinutes: 45,
        hazardNote: 'Waterlogging on bypass corridor',
      },
      'rd-puri-badadanda': {
        status: 'CAUTION',
        delayMinutes: 20,
        hazardNote: 'Gale force winds and loose signage',
      },
    },
  },

  TODAY_15: {
    id: 'scenario-today-15',
    label: 'Today 15:00 (Intensifying Squalls)',
    timeSlotName: '15:00',
    targetDate: TODAY_STR,
    targetTime: '15:00',
    slotKey: 'TODAY_15',
    rainfallIntensityMmH: 52,
    riverLevelMeters: 2.6,
    cycloneWindKmh: 95,
    stormSurgeMeters: 1.5,
    scenarioSummary:
      'Heavy tropical squalls across Puri, Kendrapara, and Jagatsinghpur; local flash inundation; high-profile vehicle restrictions.',
    activeAlertIds: [
      'al-cyclone-puri',
      'al-surge-puri',
      'al-flood-cuttack',
      'al-flood-kendrapara',
    ],
    hazardMultipliers: { flood: 1.35, cyclone: 1.5 },
    roadModifications: {
      'rd-nh16-cuttack': {
        status: 'PARTIALLY_BLOCKED',
        delayMinutes: 60,
        hazardNote: 'Single lane traffic; water depth 0.35m',
      },
      'rd-puri-badadanda': {
        status: 'BLOCKED',
        delayMinutes: 90,
        hazardNote: 'Uprooted tree blocking main avenue',
      },
    },
  },

  TODAY_18: {
    id: 'scenario-today-18',
    label: 'Today 18:00 (Peak Landfall & Storm Surge)',
    timeSlotName: '18:00',
    targetDate: TODAY_STR,
    targetTime: '18:00',
    slotKey: 'TODAY_18',
    rainfallIntensityMmH: 95,
    riverLevelMeters: 3.8,
    cycloneWindKmh: 165,
    stormSurgeMeters: 2.9,
    scenarioSummary:
      'CRITICAL LANDFALL: Eye-wall impact near coastal Puri/Konark; sustained winds 160+ km/h; 2.9m storm surge incursion; extensive roadway disruption.',
    activeAlertIds: [
      'al-cyclone-puri',
      'al-surge-puri',
      'al-flood-cuttack',
      'al-flood-kendrapara',
      'al-landslide-ghats',
    ],
    hazardMultipliers: { flood: 1.8, cyclone: 2.2 },
    roadModifications: {
      'rd-puri-badadanda': {
        status: 'BLOCKED',
        delayMinutes: 180,
        hazardNote: 'Inundated by 0.7m storm surge & fallen trees',
      },
      'rd-nh16-cuttack': {
        status: 'CLOSED',
        delayMinutes: 120,
        hazardNote: 'Mahanadi river overflow breaching barrier',
      },
      'edge-aiims-seoc': {
        status: 'CAUTION',
        delayMinutes: 30,
        hazardNote: 'Urban flash waterlogging',
      },
    },
  },

  TODAY_21: {
    id: 'scenario-today-21',
    label: 'Today 21:00 (Post-Landfall River Inundation)',
    timeSlotName: '21:00',
    targetDate: TODAY_STR,
    targetTime: '21:00',
    slotKey: 'TODAY_21',
    rainfallIntensityMmH: 75,
    riverLevelMeters: 4.2,
    cycloneWindKmh: 120,
    stormSurgeMeters: 2.1,
    scenarioSummary:
      'Severe inland flooding as river levels crest above danger marks; dam outflow increased; coastal winds slowly diminishing.',
    activeAlertIds: [
      'al-cyclone-puri',
      'al-flood-cuttack',
      'al-flood-kendrapara',
      'al-surge-puri',
    ],
    hazardMultipliers: { flood: 1.9, cyclone: 1.6 },
    roadModifications: {
      'rd-puri-badadanda': { status: 'BLOCKED', delayMinutes: 150 },
      'rd-nh16-cuttack': { status: 'CLOSED', delayMinutes: 150 },
    },
  },

  TOMORROW_06: {
    id: 'scenario-tomorrow-06',
    label: 'Tomorrow 06:00 (Lingering Floodwaters)',
    timeSlotName: '06:00',
    targetDate: TOMORROW_STR,
    targetTime: '06:00',
    slotKey: 'TOMORROW_06',
    rainfallIntensityMmH: 35,
    riverLevelMeters: 3.1,
    cycloneWindKmh: 60,
    stormSurgeMeters: 1.0,
    scenarioSummary:
      'Storm center decaying inland; gusty winds 60 km/h; river channels saturated but crest has passed; emergency crews clearing debris.',
    activeAlertIds: ['al-flood-cuttack', 'al-flood-kendrapara'],
    hazardMultipliers: { flood: 1.4, cyclone: 0.9 },
    roadModifications: {
      'rd-nh16-cuttack': {
        status: 'PARTIALLY_BLOCKED',
        delayMinutes: 60,
        hazardNote: 'Mud & silt clearance ongoing',
      },
      'rd-puri-badadanda': {
        status: 'PARTIALLY_BLOCKED',
        delayMinutes: 45,
        hazardNote: 'Tree removal operations',
      },
    },
  },

  TOMORROW_12: {
    id: 'scenario-tomorrow-12',
    label: 'Tomorrow 12:00 (Transit Restoration)',
    timeSlotName: '12:00',
    targetDate: TOMORROW_STR,
    targetTime: '12:00',
    slotKey: 'TOMORROW_12',
    rainfallIntensityMmH: 16,
    riverLevelMeters: 2.0,
    cycloneWindKmh: 40,
    stormSurgeMeters: 0.4,
    scenarioSummary:
      'Relief corridors reopening; water receding from highway networks; caution advised around waterlogged shoulders.',
    activeAlertIds: ['al-flood-cuttack'],
    hazardMultipliers: { flood: 1.1, cyclone: 0.5 },
    roadModifications: {
      'rd-nh16-cuttack': {
        status: 'CAUTION',
        delayMinutes: 20,
        hazardNote: 'Pavement inspection underway',
      },
    },
  },

  TOMORROW_18: {
    id: 'scenario-tomorrow-18',
    label: 'Tomorrow 18:00 (Transitional Calmer Conditions)',
    timeSlotName: '18:00',
    targetDate: TOMORROW_STR,
    targetTime: '18:00',
    slotKey: 'TOMORROW_18',
    rainfallIntensityMmH: 8,
    riverLevelMeters: 1.4,
    cycloneWindKmh: 25,
    stormSurgeMeters: 0.2,
    scenarioSummary:
      'Calmer weather; floodwaters largely confined to rural drainage zones; normal vehicular movement restored on main corridors.',
    activeAlertIds: [],
    hazardMultipliers: { flood: 0.7, cyclone: 0.3 },
  },

  FUTURE_48H: {
    id: 'scenario-future-48h',
    label: 'Future (+2 Days / Clear)',
    timeSlotName: '+48h',
    targetDate: FUTURE_STR,
    targetTime: '12:00',
    slotKey: 'FUTURE_48H',
    rainfallIntensityMmH: 2,
    riverLevelMeters: 0.8,
    cycloneWindKmh: 15,
    stormSurgeMeters: 0.0,
    scenarioSummary:
      'Post-event normalization; weather clear; all arterial transit routes open; emergency shelters in routine relief distribution mode.',
    activeAlertIds: [],
    hazardMultipliers: { flood: 0.3, cyclone: 0.1 },
  },
};

/**
 * Demo Scenario Provider implementation.
 * Purely deterministic, no external network calls.
 */
export class DemoScenarioProvider implements RiskScenarioProvider {
  readonly providerName = 'DemoScenarioProvider (Deterministic Disaster Modeling)';
  readonly isDemo = true;

  getScenarios(): TimeRiskScenario[] {
    return Object.values(DEMO_SCENARIOS);
  }

  getScenarioById(id: string): TimeRiskScenario {
    const found = Object.values(DEMO_SCENARIOS).find((s) => s.id === id || s.slotKey === id);
    return found ?? DEMO_SCENARIOS.NOW;
  }

  /**
   * Deterministically maps any given date + time string to the closest representative scenario.
   */
  getScenario(date?: string, time?: string): TimeRiskScenario {
    if (!date && !time) return DEMO_SCENARIOS.NOW;

    // Check if slotKey was passed directly
    if (date && date.toUpperCase() in DEMO_SCENARIOS) {
      return DEMO_SCENARIOS[date.toUpperCase() as ScenarioSlotKey];
    }

    const todayStr = TODAY_STR;
    const tomorrowStr = TOMORROW_STR;

    // Time parsing (HH:mm)
    const hour = time ? parseInt(time.split(':')[0], 10) : 13;

    // If future beyond tomorrow
    if (date && date > tomorrowStr) {
      return DEMO_SCENARIOS.FUTURE_48H;
    }

    // If tomorrow
    if (date === tomorrowStr) {
      if (hour < 9) return DEMO_SCENARIOS.TOMORROW_06;
      if (hour < 15) return DEMO_SCENARIOS.TOMORROW_12;
      return DEMO_SCENARIOS.TOMORROW_18;
    }

    // If today (or default)
    if (hour <= 12) return DEMO_SCENARIOS.TODAY_12;
    if (hour <= 16) return DEMO_SCENARIOS.TODAY_15;
    if (hour <= 19) return DEMO_SCENARIOS.TODAY_18;
    if (hour <= 23) return DEMO_SCENARIOS.TODAY_21;

    return DEMO_SCENARIOS.NOW;
  }
}

export const demoScenarioProvider = new DemoScenarioProvider();
