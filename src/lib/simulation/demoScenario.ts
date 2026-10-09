import { demoDataset, demoRoadSegments } from '@/data/demo';
import { demoCitizenReports } from '@/data/demo/citizenReports';
import type { LngLat } from '@/data/types';
import type { LiveDataOverrides } from '@/lib/realtime/types';

export const DEMO_STAGES = [
  'Ready · Puri cyclone scenario',
  'Cyclone warning issued',
  'Coastal risk zone expands inland',
  'Puri Sports Complex reaches capacity',
  'Grand Road blocked · route recalculated',
] as const;

/** Absolute snapshots make replay deterministic and leave the fixtures untouched. */
export function buildDemoScenario(step: number, timestamp: string): LiveDataOverrides {
  const stage = Math.max(0, Math.min(4, Math.trunc(step)));
  return {
    environment: 'DEMO',
    alerts: stage < 1 ? demoDataset.alerts : [{
      id: 'demo-puri-cyclone-warning', type: 'CYCLONE', severity: 'CRITICAL',
      title: 'SIMULATED: Puri cyclone evacuation warning',
      message: 'Fictional cyclone exercise: move inland and check shelter availability.',
      coordinates: [85.8315, 19.8134], regionName: 'Puri, Odisha',
      issuedAt: timestamp, isActive: true,
    }, ...demoDataset.alerts],
    riskZones: demoDataset.riskZones.map(zone => zone.id !== 'rz-puri-coast' ? zone : {
      ...zone,
      affectedPopulation: stage >= 2 ? 340000 : zone.affectedPopulation,
      coordinates: stage >= 2 ? zone.coordinates.map(ring => ring.map(([lng, lat]): LngLat =>
        [85.8 + (lng - 85.8) * 1.55, 19.85 + (lat - 19.85) * 1.55])) : zone.coordinates,
    }),
    shelters: demoDataset.shelters.map(shelter => shelter.id !== 'sh-puri-2' ? shelter : {
      ...shelter, occupancy: stage >= 3 ? shelter.capacity : 540,
      status: stage >= 3 ? 'FULL' : 'OPEN',
    }),
    roads: demoRoadSegments.map(road => road.id !== 'rd-puri-grand-road' ? road : {
      ...road, status: stage >= 4 ? 'BLOCKED' : 'OPEN',
      severity: stage >= 4 ? 'CRITICAL' : 'LOW',
      blockageType: stage >= 4 ? 'CYCLONE_DAMAGE' : 'UNKNOWN',
      lastUpdated: timestamp, isVerified: false,
      authorityVerification: { ...road.authorityVerification, isVerified: false, status: 'UNVERIFIED' },
      travelRisk: { ...road.travelRisk, score: stage >= 4 ? 95 : 8,
        severity: stage >= 4 ? 'CRITICAL' : 'LOW', safeToTravel: stage < 4,
        explanation: stage >= 4 ? 'Simulated cyclone debris blocks Grand Road.' : 'Simulated baseline: Grand Road passable.',
        travelAdvice: stage >= 4 ? 'Use the calculated alternative; this is a drill.' : 'Demo road only; conditions are fictional.' },
    }),
    reports: demoCitizenReports,
    shelterOccupancies: stage >= 3 ? { 'sh-puri-2': 800 } : {},
    resourceStocks: {}, riverGaugeDeltas: {}, rainfallDeltas: {},
  };
}
