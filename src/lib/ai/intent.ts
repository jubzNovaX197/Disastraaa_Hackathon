/**
 * AI Disaster Intelligence Assistant — Intent Classifier
 *
 * Lightweight, deterministic intent detection layer.
 * Maps user queries to operational disaster intelligence domains.
 */

import type { AssistantIntent } from './types';

interface DetectedIntentResult {
  intent: AssistantIntent;
  confidence: number;
  extractedLocation?: string;
}

const LOCATION_KEYWORDS: Record<string, string> = {
  cuttack: 'Cuttack District',
  puri: 'Puri District',
  bhubaneswar: 'Khurda District',
  bbsr: 'Khurda District',
  khurda: 'Khurda District',
  jagatsinghpur: 'Jagatsinghpur District',
  paradip: 'Jagatsinghpur District',
  gopalpur: 'Ganjam District',
  ganjam: 'Ganjam District',
  chilika: 'Puri / Ganjam Districts',
  kendrapada: 'Kendrapara District',
  kendrapara: 'Kendrapara District',
  balasore: 'Balasore District',
  bhadrak: 'Bhadrak District',
};

export function detectAssistantIntent(
  question: string,
  explicitLocation?: string,
): DetectedIntentResult {
  const q = question.toLowerCase().trim();

  // Extract location if present in query
  let extractedLocation = explicitLocation;
  if (!extractedLocation) {
    for (const [key, locName] of Object.entries(LOCATION_KEYWORDS)) {
      if (q.includes(key)) {
        extractedLocation = locName;
        break;
      }
    }
  }

  // 1. Live Changes / Recent updates
  if (
    q.includes('changed recently') ||
    q.includes('what changed') ||
    q.includes('recent update') ||
    q.includes('latest change') ||
    q.includes('what happened recently') ||
    q.includes('recent event') ||
    q.includes('last few minutes') ||
    q.includes('incoming stream')
  ) {
    return { intent: 'LIVE_CHANGE_QUERY', confidence: 0.95, extractedLocation };
  }

  // 2. Situation Summary / Briefing
  if (
    q.includes('summarize') ||
    q.includes('summary') ||
    q.includes('briefing') ||
    q.includes('overview') ||
    q.includes('current situation') ||
    q.includes('what is happening') ||
    q.includes('overall status') ||
    q.includes('general picture')
  ) {
    return { intent: 'SITUATION_SUMMARY', confidence: 0.95, extractedLocation };
  }

  // 3. Flood Analysis
  if (
    q.includes('flood') ||
    q.includes('water level') ||
    q.includes('river') ||
    q.includes('inundat') ||
    q.includes('mahanadi') ||
    q.includes('submerge') ||
    q.includes('drainage') ||
    q.includes('waterlogging') ||
    q.includes('catchment')
  ) {
    return { intent: 'FLOOD_ANALYSIS', confidence: 0.9, extractedLocation };
  }

  // 4. Cyclone Analysis
  if (
    q.includes('cyclone') ||
    q.includes('wind') ||
    q.includes('gust') ||
    q.includes('squall') ||
    q.includes('landfall') ||
    q.includes('storm surge') ||
    q.includes('gale') ||
    q.includes('eye of the storm')
  ) {
    return { intent: 'CYCLONE_ANALYSIS', confidence: 0.9, extractedLocation };
  }

  // 5. Active Alerts
  if (
    q.includes('alert') ||
    q.includes('warning') ||
    q.includes('advisory') ||
    q.includes('bulletin') ||
    q.includes('evacuation notice') ||
    q.includes('red alert') ||
    q.includes('orange alert')
  ) {
    return { intent: 'ALERT_QUERY', confidence: 0.9, extractedLocation };
  }

  // 6. Roads & Accessibility
  if (
    q.includes('road') ||
    q.includes('highway') ||
    q.includes('blocked') ||
    q.includes('route') ||
    q.includes('travel') ||
    q.includes('traffic') ||
    q.includes('nh-16') ||
    q.includes('bypass') ||
    q.includes('bridge') ||
    q.includes('passable') ||
    q.includes('transit')
  ) {
    return { intent: 'ROAD_QUERY', confidence: 0.9, extractedLocation };
  }

  // 7. Shelters & Evacuation Centers
  if (
    q.includes('shelter') ||
    q.includes('camp') ||
    q.includes('evacuee') ||
    q.includes('capacity') ||
    q.includes('occupancy') ||
    q.includes('pressure') ||
    q.includes('bed') ||
    q.includes('cyclone shelter')
  ) {
    return { intent: 'SHELTER_QUERY', confidence: 0.9, extractedLocation };
  }

  // 8. Resource Readiness & Supplies
  if (
    q.includes('resource') ||
    q.includes('shortage') ||
    q.includes('gap') ||
    q.includes('ration') ||
    q.includes('water packet') ||
    q.includes('medicine') ||
    q.includes('boat') ||
    q.includes('medical supply') ||
    q.includes('stockpile')
  ) {
    return { intent: 'RESOURCE_QUERY', confidence: 0.9, extractedLocation };
  }

  // 9. Field Reports & Citizen Intelligence
  if (
    q.includes('citizen report') ||
    q.includes('field report') ||
    q.includes('ground report') ||
    q.includes('evidence') ||
    q.includes('reported by people') ||
    q.includes('verified report')
  ) {
    return { intent: 'FIELD_REPORT_QUERY', confidence: 0.9, extractedLocation };
  }

  // 10. Risk Analysis
  if (
    q.includes('risk') ||
    q.includes('vulnerab') ||
    q.includes('hazard') ||
    q.includes('danger') ||
    q.includes('highest risk') ||
    q.includes('severity')
  ) {
    return { intent: 'RISK_ANALYSIS', confidence: 0.85, extractedLocation };
  }

  // 11. Impact & Damage
  if (
    q.includes('impact') ||
    q.includes('damage') ||
    q.includes('population') ||
    q.includes('building') ||
    q.includes('hospital') ||
    q.includes('infrastructure') ||
    q.includes('exposed')
  ) {
    return { intent: 'IMPACT_QUERY', confidence: 0.85, extractedLocation };
  }

  // 12. Response & Coordination
  if (
    q.includes('response') ||
    q.includes('priority') ||
    q.includes('operation') ||
    q.includes('action') ||
    q.includes('deploy') ||
    q.includes('require attention') ||
    q.includes('coordinat')
  ) {
    return { intent: 'RESPONSE_QUERY', confidence: 0.85, extractedLocation };
  }

  // 13. Historical Events
  if (
    q.includes('history') ||
    q.includes('past') ||
    q.includes('1999') ||
    q.includes('fani') ||
    q.includes('phailin') ||
    q.includes('previous')
  ) {
    return { intent: 'HISTORICAL_QUERY', confidence: 0.85, extractedLocation };
  }

  // Default fallback to General Operational Query
  return { intent: 'GENERAL_OPERATIONAL', confidence: 0.6, extractedLocation };
}
