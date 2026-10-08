/**
 * Live Disaster Intelligence & Real-Time Operations — Deterministic Events
 *
 * Provides structured operational telemetry events that simulate evolving disaster
 * conditions across coastal Odisha & Andhra Pradesh.
 *
 * Deterministic, realistic operational scenarios:
 *   HYDRO/MET SURGE → ROAD DISRUPTION → CITIZEN REPORT → ALERT ESCALATION → SHELTER SURGE → RESOURCE RELIEF
 */

import type { LiveEvent, LiveDataOverrides } from './types';
import type { CitizenReportItem } from '@/lib/reports/types';
import type { RoadStatus } from '@/lib/roads/types';

export const DETERMINISTIC_LIVE_EVENTS: LiveEvent[] = [
  {
    id: 'evt-live-01',
    type: 'HYDRO_MET_SURGE',
    timestamp: new Date().toISOString(),
    timeFormatted: 'Just now',
    locationName: 'Mahanadi Delta & Cuttack Lowlands',
    district: 'Cuttack District',
    title: 'Mahanadi Naraj Gauge Inflow Spike',
    summary: 'River stage rises +0.8m above danger mark due to upper catchment runoff. Delta distributaries on high alert.',
    severity: 'HIGH',
    category: 'SENSOR',
    metadata: {
      zoneId: 'mh-mahanadi-delta',
      gaugeSurgeMeters: 0.8,
      inflowCusecs: 920000,
    },
  },
  {
    id: 'evt-live-02',
    type: 'ROAD_STATUS_CHANGED',
    timestamp: new Date().toISOString(),
    timeFormatted: '2m ago',
    locationName: 'NH-16 Cuttack North Bypass',
    district: 'Cuttack District',
    title: 'NH-16 North Bypass Impaired by Floodwater',
    summary: 'Water accumulation reached 0.45m over southbound lanes. Passage restricted to high-clearance emergency vehicles under police convoy.',
    severity: 'HIGH',
    category: 'ROAD',
    metadata: {
      roadId: 'rd-nh16-cuttack',
      previousStatus: 'OPEN',
      newStatus: 'CAUTION',
      delayMinutes: 35,
    },
  },
  {
    id: 'evt-live-03',
    type: 'REPORT_RECEIVED',
    timestamp: new Date().toISOString(),
    timeFormatted: '4m ago',
    locationName: 'Nuapatna Embankment Sector',
    district: 'Cuttack District',
    title: 'New Citizen Field Report: Embankment Seepage',
    summary: 'Resident reports 15-meter embankment seepage with water entering agricultural bunds. Awaiting official field verification.',
    severity: 'HIGH',
    category: 'REPORT',
    metadata: {
      reportId: 'cr-live-001',
      reportType: 'FLOOD',
      verified: false,
    },
  },
  {
    id: 'evt-live-04',
    type: 'ALERT_UPDATED',
    timestamp: new Date().toISOString(),
    timeFormatted: '6m ago',
    locationName: 'Paradip Port & Industrial Hub',
    district: 'Jagatsinghpur District',
    title: 'Cyclone Landfall Warning Escalated to Critical',
    summary: 'Special Weather Bulletin upgrades squall warning for coastal Jagatsinghpur. Sustained gale winds projected >185 km/h.',
    severity: 'CRITICAL',
    category: 'ALERT',
    metadata: {
      alertId: 'al-cyclone-01',
      previousSeverity: 'HIGH',
      newSeverity: 'CRITICAL',
    },
  },
  {
    id: 'evt-live-05',
    type: 'SHELTER_OCCUPANCY_CHANGED',
    timestamp: new Date().toISOString(),
    timeFormatted: '8m ago',
    locationName: 'Puri District Sports Complex Shelter',
    district: 'Puri District',
    title: 'Puri Shelter Surge: 95% Occupancy Reached',
    summary: 'Rapid evacuation from Swargadwar coastal wards has added 220 evacuees (760 / 800 beds occupied; status elevated to PRESSURE).',
    severity: 'MODERATE',
    category: 'SHELTER',
    metadata: {
      shelterId: 'sh-puri-2',
      previousOccupancy: 540,
      newOccupancy: 760,
      capacity: 800,
    },
  },
  {
    id: 'evt-live-06',
    type: 'ROAD_STATUS_CHANGED',
    timestamp: new Date().toISOString(),
    timeFormatted: '11m ago',
    locationName: 'Puri Grand Road Corridor',
    district: 'Puri District',
    title: 'Grand Road Trunk Debris Partially Cleared',
    summary: 'ODRAF and Fire Service personnel cleared fallen banyan branches. One lane reopened under emergency escort.',
    severity: 'MODERATE',
    category: 'ROAD',
    metadata: {
      roadId: 'rd-puri-grand-road',
      previousStatus: 'BLOCKED',
      newStatus: 'CAUTION',
    },
  },
  {
    id: 'evt-live-07',
    type: 'RESOURCE_STOCKPILE_CHANGED',
    timestamp: new Date().toISOString(),
    timeFormatted: '14m ago',
    locationName: 'Mahanadi Forward Logistics Depot',
    district: 'Cuttack District',
    title: 'Relief Convoy Arrived: +12,000L Water & 4 Boats',
    summary: 'Inter-district emergency replenishment from State Central Stockpile reached Cuttack forward depot, narrowing the local supply gap.',
    severity: 'LOW',
    category: 'RESOURCE',
    metadata: {
      resourceCategory: 'WATER',
      addedStock: 12000,
      boatsAdded: 4,
    },
  },
  {
    id: 'evt-live-08',
    type: 'REPORT_VERIFIED',
    timestamp: new Date().toISOString(),
    timeFormatted: '17m ago',
    locationName: 'Nuapatna Embankment Sector',
    district: 'Cuttack District',
    title: 'Ground Report Verified by Water Resources Engineer',
    summary: 'Junior Engineer confirms 15m bund seepage at Nuapatna; sandbagging teams deployed on site. Trust confidence set to 95%.',
    severity: 'HIGH',
    category: 'REPORT',
    metadata: {
      reportId: 'cr-live-001',
      status: 'VERIFIED',
      verifiedBy: 'Odisha Water Resources Dept — Sub-Division 3',
    },
  },
  {
    id: 'evt-live-09',
    type: 'HYDRO_MET_SURGE',
    timestamp: new Date().toISOString(),
    timeFormatted: '20m ago',
    locationName: 'Puri Coastal Belt & Town',
    district: 'Puri District',
    title: 'Marine Storm Surge Spike: +1.1m Sea Gauge',
    summary: 'Astronomical high tide coincides with onshore gale wind swell. Coastal marine surge reaches +1.1m at Chandrabhaga.',
    severity: 'CRITICAL',
    category: 'SENSOR',
    metadata: {
      zoneId: 'mh-puri-coast',
      surgeMeters: 1.1,
    },
  },
  {
    id: 'evt-live-10',
    type: 'ALERT_EXPIRED',
    timestamp: new Date().toISOString(),
    timeFormatted: '25m ago',
    locationName: 'Bhubaneswar Capital Metropolitan',
    district: 'Khurda District',
    title: 'Urban Waterlogging Advisory De-escalated',
    summary: 'Inner ring stormwater pumping stations have stabilized secondary arterial drains. Advisory downscaled to Moderate.',
    severity: 'LOW',
    category: 'ALERT',
    metadata: {
      alertId: 'al-flood-bbsr',
      previousSeverity: 'HIGH',
      newSeverity: 'MODERATE',
    },
  },
];

/**
 * Deterministically applies a live event to current data overrides.
 */
export function applyLiveEventToOverrides(
  current: LiveDataOverrides,
  event: LiveEvent,
): LiveDataOverrides {
  const next: LiveDataOverrides = {
    alerts: [...current.alerts],
    reports: [...current.reports],
    roads: [...current.roads],
    shelters: [...current.shelters],
    shelterOccupancies: { ...current.shelterOccupancies },
    resourceStocks: { ...current.resourceStocks },
    riverGaugeDeltas: { ...current.riverGaugeDeltas },
    rainfallDeltas: { ...current.rainfallDeltas },
  };

  switch (event.type) {
    case 'HYDRO_MET_SURGE': {
      const zoneId = (event.metadata?.zoneId as string) || 'mh-mahanadi-delta';
      const surge = (event.metadata?.gaugeSurgeMeters as number) || (event.metadata?.surgeMeters as number) || 0.8;
      next.riverGaugeDeltas[zoneId] = (next.riverGaugeDeltas[zoneId] || 0) + surge;
      break;
    }

    case 'ROAD_STATUS_CHANGED': {
      const roadId = event.metadata?.roadId as string;
      const newStatus = event.metadata?.newStatus as RoadStatus;
      if (roadId && newStatus) {
        next.roads = next.roads.map((r) =>
          r.id === roadId ? { ...r, status: newStatus, lastUpdated: new Date().toISOString() } : r,
        );
      }
      break;
    }

    case 'REPORT_RECEIVED': {
      const reportId = (event.metadata?.reportId as string) || `cr-live-${Date.now()}`;
      // Ensure it doesn't already exist
      if (!next.reports.some((r) => r.id === reportId)) {
        const newReport: CitizenReportItem = {
          id: reportId,
          reportType: 'FLOOD',
          hazardType: 'FLOOD',
          type: 'FLOOD',
          title: event.title,
          description: event.summary,
          coordinates: [85.895, 20.468],
          address: 'Nuapatna Embankment Sector, Cuttack',
          administrativeArea: 'Cuttack District, Odisha',
          reporter: {
            isAnonymous: false,
            name: 'Sunil Patnaik (Local Citizen)',
            role: 'CITIZEN',
          },
          severity: event.severity,
          status: 'PENDING',
          confirmCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          evidence: [
            {
              id: `ev-${reportId}`,
              type: 'PHOTO',
              fileName: 'nuapatna_bund_seepage.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 1850000,
              previewUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
              status: 'AVAILABLE',
              source: 'CITIZEN_UPLOAD',
              timestamp: new Date().toISOString(),
              caption: 'Water accumulating against earthen bund',
              metadata: {
                locationEstimate: 'Nuapatna Embankment Sector, Cuttack',
                hasGeolocation: true,
                coordinates: [85.895, 20.468],
              },
            },
          ],
          communityConfirmations: {
            confirmCount: 1,
            suspiciousCount: 0,
            userFeedback: null,
          },
          preliminaryAnalysis: {
            confidence: 'MEDIUM_CONFIDENCE',
            score: 68,
            completenessScore: 75,
            evidenceScore: 65,
            riskProximityScore: 75,
            alertProximityScore: 70,
            urgency: 'HIGH',
            indicators: ['Embankment breach proximity', 'Visual evidence submitted', 'High river stage correlation'],
            summary: 'Preliminary review matches Naraj flood stage warning. Requires field engineer verification.',
            potentialAlertTrigger: true,
            duplicateIndicator: false,
            analyzedAt: new Date().toISOString(),
          },
          authorityVerification: {
            status: 'UNREVIEWED',
          },
          linkedIntelligence: {
            nearbyRiskZone: {
              id: 'rz-cuttack-north',
              name: 'Mahanadi Delta - Cuttack North',
              severity: 'HIGH',
              score: 82,
              primaryHazard: 'FLOOD',
              distanceKm: 0.6,
            },
            nearbyAlert: {
              id: 'al-flood-cuttack',
              title: 'Mahanadi Flood Inundation Alert',
              severity: 'HIGH',
              type: 'FLOOD',
              distanceKm: 1.2,
            },
            nearbyBlockedRoad: {
              id: 'rd-nh16-cuttack',
              name: 'NH-16 Cuttack North Bypass',
              severity: 'PARTIAL',
              reason: 'Overtopping flood water (0.45m depth)',
              distanceKm: 2.1,
            },
          },
        };
        next.reports = [newReport, ...next.reports];
      }
      break;
    }

    case 'REPORT_VERIFIED': {
      const reportId = (event.metadata?.reportId as string) || 'cr-live-001';
      next.reports = next.reports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: 'VERIFIED',
              confirmCount: r.confirmCount + 12,
              updatedAt: new Date().toISOString(),
            }
          : r,
      );
      break;
    }

    case 'ALERT_UPDATED': {
      const alertId = event.metadata?.alertId as string;
      const newSeverity = event.metadata?.newSeverity as typeof event.severity;
      if (alertId && newSeverity) {
        next.alerts = next.alerts.map((a) =>
          a.id === alertId ? { ...a, severity: newSeverity, issuedAt: new Date().toISOString() } : a,
        );
      }
      break;
    }

    case 'ALERT_EXPIRED': {
      const alertId = event.metadata?.alertId as string;
      const newSeverity = event.metadata?.newSeverity as typeof event.severity;
      if (alertId) {
        next.alerts = next.alerts.map((a) =>
          a.id === alertId ? { ...a, severity: newSeverity || 'MODERATE' } : a,
        );
      }
      break;
    }

    case 'SHELTER_OCCUPANCY_CHANGED': {
      const shelterId = event.metadata?.shelterId as string;
      const newOccupancy = event.metadata?.newOccupancy as number;
      if (shelterId && typeof newOccupancy === 'number') {
        next.shelterOccupancies[shelterId] = newOccupancy;
        next.shelters = next.shelters.map((s) =>
          s.id === shelterId
            ? {
                ...s,
                occupancy: newOccupancy,
                status: newOccupancy >= s.capacity ? 'FULL' : 'OPEN',
              }
            : s,
        );
      }
      break;
    }

    case 'RESOURCE_STOCKPILE_CHANGED': {
      const addedWater = (event.metadata?.addedStock as number) || 12000;
      next.resourceStocks['WATER'] = (next.resourceStocks['WATER'] || 0) + addedWater;
      const addedBoats = (event.metadata?.boatsAdded as number) || 4;
      next.resourceStocks['BOATS'] = (next.resourceStocks['BOATS'] || 0) + addedBoats;
      break;
    }
  }

  return next;
}
