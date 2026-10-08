/**
 * DEMO DATA — Blocked / Disrupted Road Segments
 *
 * ⚠️  SIMULATED DATA ONLY. Not real government data. For prototype demonstration.
 */

import type { BlockedRoad } from '@/data/types';

export const demoBlockedRoads: BlockedRoad[] = [
  {
    id: 'br-nh316-puri',
    name: 'NH-316 Puri–Konark Coastal Road',
    severity: 'FULL',
    reason: 'Storm surge inundation — 1.5 m water depth on road surface',
    coordinates: [
      [85.8315, 19.8000],
      [85.8700, 19.7820],
      [85.9300, 19.7600],
    ],
    since: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    alternateRoute: 'NH-316B via Bhubaneswar bypass',
  },
  {
    id: 'br-nh16-cuttack',
    name: 'NH-16 Cuttack North Bypass',
    severity: 'PARTIAL',
    reason: 'Mahanadi floodwater across road — one lane passable',
    coordinates: [
      [85.8500, 20.5100],
      [85.8830, 20.5000],
      [85.9100, 20.4900],
    ],
    since: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    alternateRoute: 'Old NH-5 via Athagarh',
  },
  {
    id: 'br-kendrapara-village',
    name: 'Kendrapara–Rajnagar Road (SH-12)',
    severity: 'FULL',
    reason: 'Bridge submerged — 12 villages isolated',
    coordinates: [
      [86.4500, 20.4800],
      [86.5200, 20.4200],
      [86.5800, 20.3700],
    ],
    since: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'br-nh16-ghats',
    name: 'NH-16 Eastern Ghats Mountain Section',
    severity: 'PARTIAL',
    reason: 'Landslide debris on road; clearance underway',
    coordinates: [
      [83.1800, 18.2800],
      [83.2200, 18.2000],
      [83.2500, 18.1500],
    ],
    since: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    alternateRoute: 'Coastal highway via Bheemunipatnam',
  },
  {
    id: 'br-bhadrak-embankment',
    name: 'Bhadrak Embankment Road',
    severity: 'FULL',
    reason: 'Embankment breach — road submerged',
    coordinates: [
      [86.4987, 21.0800],
      [86.5300, 21.0500],
    ],
    since: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
  },
];
