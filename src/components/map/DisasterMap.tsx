'use client';

/**
 * DisasterMap — orchestrates all disaster intelligence map layers.
 *
 * Panel hierarchy on zone click:
 *  1. If a multi-hazard composite exists for the zone → MultiHazardPanel + ImpactPredictionPanel tab
 *  2. Cyclone-only zone                               → CycloneRiskPanel
 *  3. Flood-only zone                                 → FloodRiskPanel
 *  4. Other layers                                    → MapLibre popup
 */

import { DataProvenance } from '@/components/demo/DataProvenance';
import { ImpactPredictionPanel } from '@/components/impact/ImpactPredictionPanel';
import { ResourceRequirementPanel } from '@/components/planning/ResourceRequirementPanel';
import { ShelterRequirementPanel } from '@/components/planning/ShelterRequirementPanel';
import { CitizenReportForm } from '@/components/reports/CitizenReportForm';
import { ReportDetailPanel } from '@/components/reports/ReportDetailPanel';
import { CycloneRiskPanel } from '@/components/risk/CycloneRiskPanel';
import { FloodRiskPanel } from '@/components/risk/FloodRiskPanel';
import { MultiHazardPanel } from '@/components/risk/MultiHazardPanel';
import { RoadDetailPanel } from '@/components/roads/RoadDetailPanel';
import { RouteMapOverlay } from '@/components/routing/RouteMapOverlay';
import { getBasemapStyle, mapLayerIds, type BasemapStyleId } from '@/config/map';
import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import { useTheme } from '@/context/ThemeContext';
import { demoRoadSegments } from '@/data/demo';
import { demoCitizenReports } from '@/data/demo/citizenReports';
import { computedCycloneRisks } from '@/data/demo/computedCycloneRisks';
import { computedFloodRisks } from '@/data/demo/computedFloodRisks';
import {
  computedMultiHazardRisks,
  ZONE_TO_MULTI_HAZARD_ID,
} from '@/data/demo/computedMultiHazardRisks';
import { demoCycloneTrack, demoCycloneZones } from '@/data/demo/cycloneZones';
import { demoHistoricalEvents } from '@/data/demo/historicalEvents';
import {
  alertsToGeoJSON,
  citizenReportsToGeoJSON,
  cycloneLandfallToGeoJSON,
  cycloneTrackToGeoJSON,
  cycloneZonesToGeoJSON,
  floodAreasToGeoJSON,
  historicalEventsToGeoJSON,
  infrastructureToGeoJSON,
  riskZonesToGeoJSON,
  roadSegmentsToGeoJSON,
  sheltersToGeoJSON
} from '@/data/geojson';
import type { DisasterDataset } from '@/data/types';
import type { DestinationSafetyStatus } from '@/lib/destination/types';
import type { ImpactResult } from '@/lib/impact';
import { calculateImpact, DEMO_ZONE_EXPOSURE, fallbackExposure } from '@/lib/impact';
import { buildResourcePlanningForZone, type ResourcePlanningResult } from '@/lib/planning/resources';
import { buildShelterPlanningForZone, type ShelterPlanningResult } from '@/lib/planning/shelter';
import { getFeedLabel } from '@/lib/realtime/feedStatus';
import { type CitizenReportItem } from '@/lib/reports';
import type { CycloneRiskExplanation } from '@/lib/risk/cyclone';
import type { FloodRiskExplanation } from '@/lib/risk/flood';
import type { MultiHazardRiskExplanation } from '@/lib/risk/multiHazard';
import type { RoadSegment } from '@/lib/roads/types';
import type { RouteResult } from '@/lib/routing/types';
import { cn } from '@/lib/utils';
import { Crosshair, Loader2 } from 'lucide-react';
import type { Map as MLMap } from 'maplibre-gl';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { BasemapSelector } from './BasemapSelector';
import { LayerControl, type LayerToggle } from './LayerControl';
import {
  addAlertLayers,
  addBlockedRoadLayers,
  addCitizenReportLayers,
  addCycloneTrackLayers,
  addCycloneZoneLayers,
  addFloodAreaLayers,
  addHistoricalEventLayers,
  addInfrastructureLayers,
  addOrUpdateDestinationSafetyLayers,
  addOrUpdateJourneyCorridorLayers,
  addOrUpdateRouteLayers,
  addRiskZoneLayers,
  addShelterLayers,
  removeDestinationSafetyLayers,
  removeJourneyCorridorLayers,
  removeRouteLayers,
} from './layers/addLayers';
import {
  alertPopupHTML,
  blockedRoadPopupHTML,
  citizenReportPopupHTML,
  floodAreaPopupHTML,
  historicalEventPopupHTML,
  infrastructurePopupHTML,
  shelterPopupHTML,
} from './layers/popups';
import { LiveWeatherWidget } from './LiveWeatherWidget';
import { MapContainer } from './MapContainer';
import { MapLegend } from './MapLegend';

// ── Layer definitions ─────────────────────────────────────────────────────────

const INITIAL_LAYERS: LayerToggle[] = [
  { id: 'riskZones',     label: 'Risk Zones',     icon: '🔺', color: '#EF4444', enabled: true  },
  { id: 'floodAreas',   label: 'Flood Areas',     icon: '🌊', color: '#3B82F6', enabled: true  },
  { id: 'cycloneZones', label: 'Cyclone Zones',   icon: '🌀', color: '#A78BFA', enabled: true  },
  { id: 'cycloneTrack', label: 'Cyclone Track',   icon: '🎯', color: '#7C3AED', enabled: true  },
  { id: 'shelters',     label: 'Shelters',         icon: '⛺', color: '#10B981', enabled: true  },
  { id: 'alerts',       label: 'Alerts',           icon: '📡', color: '#F59E0B', enabled: true  },
  { id: 'infra',        label: 'Infrastructure',   icon: '🏥', color: '#22D3EE', enabled: true  },
  { id: 'blockedRoads', label: 'Road Network & Disruptions', icon: '🛣️', color: '#F97316', enabled: true  },
  { id: 'reports',      label: 'Citizen Reports',  icon: '📍', color: '#8B5CF6', enabled: false },
  { id: 'historical',   label: 'Historical Events', icon: '🕐', color: '#94A3B8', enabled: false },
];

const LAYER_GROUP_MAP: Record<string, string[]> = {
  riskZones:    [mapLayerIds.riskZoneFill, mapLayerIds.riskZoneOutline],
  floodAreas:   [mapLayerIds.hazardEvents, `${mapLayerIds.hazardEvents}-outline`],
  cycloneZones: [mapLayerIds.cycloneZoneFill, mapLayerIds.cycloneZoneOutline],
  cycloneTrack: [mapLayerIds.cycloneTrack, `${mapLayerIds.cycloneTrack}-casing`, mapLayerIds.cycloneLandfall],
  shelters:     [mapLayerIds.shelters, `${mapLayerIds.shelters}-label`],
  alerts:       [mapLayerIds.alerts, `${mapLayerIds.alerts}-halo`],
  infra:        [mapLayerIds.hospitals],
  blockedRoads: [mapLayerIds.blockedRoads, `${mapLayerIds.blockedRoads}-casing`],
  reports:      [mapLayerIds.citizenReports],
  historical:   [mapLayerIds.historicalEvents, `${mapLayerIds.historicalEvents}-dot`],
};

// ── Popup-only layers ─────────────────────────────────────────────────────────

type PopupBuilder = (props: Record<string, unknown>) => string;

const NON_RISK_CLICKABLE: { layerId: string; builder: PopupBuilder }[] = [
  { layerId: mapLayerIds.hazardEvents,           builder: floodAreaPopupHTML      },
  { layerId: mapLayerIds.shelters,               builder: shelterPopupHTML        },
  { layerId: mapLayerIds.alerts,                 builder: alertPopupHTML          },
  { layerId: `${mapLayerIds.alerts}-halo`,       builder: alertPopupHTML          },
  { layerId: mapLayerIds.hospitals,              builder: infrastructurePopupHTML },
  { layerId: mapLayerIds.blockedRoads,           builder: blockedRoadPopupHTML    },
  { layerId: mapLayerIds.citizenReports,         builder: citizenReportPopupHTML  },
  { layerId: mapLayerIds.historicalEvents,       builder: historicalEventPopupHTML },
  { layerId: `${mapLayerIds.historicalEvents}-dot`, builder: historicalEventPopupHTML },
];

// ── Panel state ───────────────────────────────────────────────────────────────

type HazardPanelState =
  | { type: 'multiHazard'; id: string; name: string; explanation: MultiHazardRiskExplanation }
  | { type: 'flood';       id: string; name: string; explanation: FloodRiskExplanation }
  | { type: 'cyclone';     id: string; name: string; explanation: CycloneRiskExplanation }
  | null;

type ZoneDetailTab = 'risk' | 'impact' | 'shelter' | 'resources';

// ── Impact helper ─────────────────────────────────────────────────────────────

function buildImpact(mhId: string, zoneName: string, expl: MultiHazardRiskExplanation): ImpactResult {
  const { result } = expl;
  const exposure = DEMO_ZONE_EXPOSURE[mhId] ?? fallbackExposure(result.affectedPopulation);
  return calculateImpact(mhId, zoneName, {
    riskScore:      result.score,
    severity:       result.severity,
    dominantHazard: result.dominantHazard,
    exposure,
  });
}

// ── Route colors (outside component to avoid recreation) ────────────────────
const ROUTE_COLORS: Record<string, string> = {
  SAFEST:      '#10B981',
  SHORTEST:    '#F59E0B',
  ALTERNATIVE: '#A78BFA',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface DisasterMapProps {
  dataset:        DisasterDataset;
  className?:     string;
  center?:        [number, number];
  zoom?:          number;
  initialLayers?: LayerToggle[];
  environment?:   'REAL' | 'DEMO';
}

export function DisasterMap({ dataset, className, center, zoom, initialLayers, environment }: DisasterMapProps) {
  const { status: feedStatus, lastSuccessfulSync } = useLiveIntelligence();
  const envMode = environment ?? dataset.environment ?? 'REAL';
  const isDemo = envMode === 'DEMO';
  const { theme } = useTheme();
  const [basemap, setBasemap]         = useState<BasemapStyleId>(theme === 'light' ? 'light' : 'dark');

  // Synchronize with OS theme changes unless user explicitly switched to satellite / streets
  useEffect(() => {
    setBasemap((prev) => {
      if (prev === 'dark' || prev === 'light') {
        return theme === 'light' ? 'light' : 'dark';
      }
      return prev;
    });
  }, [theme]);

  const mapStyle                      = getBasemapStyle(basemap);
  const [layers, setLayers]           = useState<LayerToggle[]>(initialLayers ?? INITIAL_LAYERS);
  const [activePanel, setActivePanel] = useState<HazardPanelState>(null);
  const [activeReport, setActiveReport] = useState<CitizenReportItem | null>(null);
  const [activeRoad, setActiveRoad] = useState<RoadSegment | null>(null);
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsReportFormOpen(true);
    window.addEventListener('disastraaa:open-report', handleOpen);
    return () => window.removeEventListener('disastraaa:open-report', handleOpen);
  }, []);
  const [activeTab, setActiveTab]     = useState<ZoneDetailTab>('risk');
  const [, setActiveRouteMode] = useState<RouteResult['mode'] | null>(null);
  const mapRef                        = useRef<MLMap | null>(null);
  const popupRef                      = useRef<import('maplibre-gl').Popup | null>(null);
  const prevLayers                    = useRef<LayerToggle[]>(initialLayers ?? INITIAL_LAYERS);
  const layersRef                     = useRef<LayerToggle[]>(initialLayers ?? INITIAL_LAYERS);
  const clickHandlerRef               = useRef<((e: any) => void) | null>(null);
  const mouseMoveHandlerRef           = useRef<((e: any) => void) | null>(null);

  // ── Geolocation & Current Location Marker state ──────────────────────────
  const userMarkerRef                 = useRef<import('maplibre-gl').Marker | null>(null);
  const userHasPannedRef              = useRef(false);
  const [geoNotice, setGeoNotice]     = useState<string | null>(null);

  const {
    status: geoStatus,
    coordinates: userCoords,
    errorMessage: geoError,
    requestLocation,
  } = useGeolocation({ autoRequest: true, sessionKey: 'disastraaa_main_map_session' });

  const updateUserMarker = useCallback(async (coords: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(coords);
      return;
    }

    try {
      const { Marker, Popup } = await import('maplibre-gl');
      if (!mapRef.current) return;

      const el = document.createElement('div');
      el.className = 'disaster-user-marker';
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', 'Your Current Location');
      el.innerHTML = `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;">
          <div style="position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(37,99,235,0.35);animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:2.5px solid #FFFFFF;box-shadow:0 0 10px rgba(37,99,235,0.85);z-index:2;display:flex;align-items:center;justify-content:center;">
            <div style="width:5px;height:5px;border-radius:50%;background:#FFFFFF;"></div>
          </div>
        </div>
      `;

      const popup = new Popup({ offset: 16, closeButton: false }).setHTML(`
        <div style="font-family:system-ui,-apple-system,sans-serif;padding:3px 6px;font-size:11px;font-weight:600;color:#1E3A8A;">
          📍 Your Current Location
        </div>
      `);

      const marker = new Marker({ element: el })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map);

      userMarkerRef.current = marker;
    } catch {
      // Ignore dynamic import / marker creation errors
    }
  }, []);

  // Update marker and center map on initial auto-locate without repeating on pan
  useEffect(() => {
    if (!userCoords || !mapRef.current) return;
    updateUserMarker(userCoords);

    if (!userHasPannedRef.current) {
      mapRef.current.flyTo({
        center: userCoords,
        zoom: 13.5,
        speed: 1.2,
      });
    }
  }, [userCoords, updateUserMarker]);

  // Clean up user marker on unmount
  useEffect(() => {
    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, []);

  const handleManualLocate = useCallback(async () => {
    setGeoNotice(null);
    userHasPannedRef.current = false;
    const coords = await requestLocation();
    if (coords && mapRef.current) {
      mapRef.current.flyTo({
        center: coords,
        zoom: 13.5,
        speed: 1.3,
      });
      updateUserMarker(coords);
    } else {
      setGeoNotice(geoError || 'Location unavailable. Map remains at current view.');
      setTimeout(() => setGeoNotice(null), 4500);
    }
  }, [requestLocation, geoError, updateUserMarker]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  // ── Layer visibility sync ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layers.forEach((layer) => {
      const prev = prevLayers.current.find((l) => l.id === layer.id);
      if (prev?.enabled === layer.enabled) return;
      const vis = layer.enabled ? 'visible' : 'none';
      LAYER_GROUP_MAP[layer.id]?.forEach((mlId) => {
        if (map.getLayer(mlId)) map.setLayoutProperty(mlId, 'visibility', vis);
      });
    });
    prevLayers.current = layers;
  }, [layers]);

  // ── Sync citizen reports dynamically to map source ────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (dataset.citizenReports) {
      addCitizenReportLayers(map, citizenReportsToGeoJSON(dataset.citizenReports));
    }
  }, [dataset.citizenReports]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    addRiskZoneLayers(map, riskZonesToGeoJSON(dataset.riskZones ?? []));
    addFloodAreaLayers(map, floodAreasToGeoJSON(dataset.floodAreas ?? []));
    addShelterLayers(map, sheltersToGeoJSON(dataset.shelters ?? []));
    addAlertLayers(map, alertsToGeoJSON(dataset.alerts ?? []));
    addBlockedRoadLayers(map, roadSegmentsToGeoJSON(dataset.roads ?? []));
    addCitizenReportLayers(map, citizenReportsToGeoJSON(dataset.citizenReports ?? []));
    addCycloneZoneLayers(map, cycloneZonesToGeoJSON(dataset.cycloneZones ?? []));
  }, [dataset]);

  // ── Map ready ────────────────────────────────────────────────────────────
  const handleMapReady = useCallback(async (map: MLMap) => {
    mapRef.current = map;
    const { Popup } = await import('maplibre-gl');

    addRiskZoneLayers(map, riskZonesToGeoJSON(dataset.riskZones));
    addFloodAreaLayers(map, floodAreasToGeoJSON(dataset.floodAreas));
    addShelterLayers(map, sheltersToGeoJSON(dataset.shelters));
    addAlertLayers(map, alertsToGeoJSON(dataset.alerts));
    addInfrastructureLayers(map, infrastructureToGeoJSON(dataset.infrastructure));

    const roadNetworkData = dataset.roads ?? (isDemo ? demoRoadSegments : []);
    addBlockedRoadLayers(map, roadSegmentsToGeoJSON(roadNetworkData));
    addCitizenReportLayers(map, citizenReportsToGeoJSON(dataset.citizenReports));

    const cycloneZonesData = dataset.cycloneZones ?? (isDemo ? demoCycloneZones : []);
    addCycloneZoneLayers(map, cycloneZonesToGeoJSON(cycloneZonesData));

    const cycloneTrackData = dataset.cycloneTrack ?? (isDemo ? demoCycloneTrack : null);
    if (cycloneTrackData) {
      addCycloneTrackLayers(
        map,
        cycloneTrackToGeoJSON(cycloneTrackData),
        cycloneLandfallToGeoJSON(cycloneTrackData),
      );
    }

    const historicalData = isDemo ? demoHistoricalEvents : [];
    if (historicalData.length > 0) {
      addHistoricalEventLayers(map, historicalEventsToGeoJSON(historicalData));
    }

    // Preserve active layer states across initial load & style reloads
    layersRef.current.forEach((layer) => {
      const vis = layer.enabled ? 'visible' : 'none';
      LAYER_GROUP_MAP[layer.id]?.forEach((mlId) => {
        if (map.getLayer(mlId)) map.setLayoutProperty(mlId, 'visibility', vis);
      });
    });

    const candidateClickableIds = [
      mapLayerIds.riskZoneFill,
      mapLayerIds.cycloneZoneFill,
      ...NON_RISK_CLICKABLE.map((c) => c.layerId),
    ];

    // Detect manual user pans or zooms to avoid auto-centering disrupting user navigation
    map.on('dragstart', () => {
      userHasPannedRef.current = true;
    });
    map.on('zoomstart', () => {
      userHasPannedRef.current = true;
    });

    if (userCoords) {
      updateUserMarker(userCoords);
      if (!userHasPannedRef.current) {
        map.flyTo({ center: userCoords, zoom: 13.5, speed: 1.2 });
      }
    }

    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
    }
    if (mouseMoveHandlerRef.current) {
      map.off('mousemove', mouseMoveHandlerRef.current);
    }

    const handleMouseMove = (e: import('maplibre-gl').MapMouseEvent) => {
      const activeIds = candidateClickableIds.filter((id) => !!map.getLayer(id));
      if (!activeIds.length) {
        map.getCanvas().style.cursor = '';
        return;
      }
      try {
        const feats = map.queryRenderedFeatures(e.point, { layers: activeIds });
        map.getCanvas().style.cursor = feats.length > 0 ? 'pointer' : '';
      } catch {
        map.getCanvas().style.cursor = '';
      }
    };

    const handleClick = (e: import('maplibre-gl').MapMouseEvent) => {
      const activeClickableIds = candidateClickableIds.filter((id) => !!map.getLayer(id));
      if (!activeClickableIds.length) {
        setActivePanel(null);
        setActiveReport(null);
        return;
      }

      let features: import('maplibre-gl').MapGeoJSONFeature[] = [];
      try {
        features = map.queryRenderedFeatures(e.point, { layers: activeClickableIds });
      } catch {
        setActivePanel(null);
        setActiveReport(null);
        return;
      }

      if (!features.length) {
        setActivePanel(null);
        setActiveReport(null);
        return;
      }

      const feature = features[0];
      const props   = (feature.properties ?? {}) as Record<string, unknown>;
      const layerId = feature.layer.id;

      // ── Risk zone clicks (flood or cyclone fill layers) ──
      if (layerId === mapLayerIds.riskZoneFill || layerId === mapLayerIds.cycloneZoneFill) {
        popupRef.current?.remove();
        setActiveReport(null);
        const zoneId = String(props.id ?? '');
        const zoneName = String(props.name ?? zoneId);

        // 1. In demo mode, try computed demo risk explanations
        if (isDemo) {
          const mhId = ZONE_TO_MULTI_HAZARD_ID[zoneId];
          if (mhId && computedMultiHazardRisks[mhId]) {
            setActiveTab('risk');
            setActivePanel({ type: 'multiHazard', id: mhId, name: zoneName, explanation: computedMultiHazardRisks[mhId] });
            return;
          }

          // 2. Fall back to cyclone-only
          if (layerId === mapLayerIds.cycloneZoneFill) {
            const ex = computedCycloneRisks[zoneId];
            if (ex) {
              setActiveTab('risk');
              setActivePanel({ type: 'cyclone', id: zoneId, name: zoneName, explanation: ex });
            }
            return;
          }

          // 3. Fall back to flood-only
          const ex = computedFloodRisks[zoneId];
          if (ex) {
            setActiveTab('risk');
            setActivePanel({ type: 'flood', id: zoneId, name: zoneName, explanation: ex });
          }
        }
        return;
      }

      // ── Citizen report clicked → open detail panel ──
      if (layerId === mapLayerIds.citizenReports) {
        popupRef.current?.remove();
        setActivePanel(null);
        setActiveRoad(null);
        const reportId = String(props.id ?? '');
        const allReports = (dataset.citizenReports as unknown as CitizenReportItem[]) || (isDemo ? demoCitizenReports : []);
        const found = allReports.find((r) => r.id === reportId);
        if (found) {
          setActiveReport(found as CitizenReportItem);
          return;
        }
      }

      // ── Road network clicked → open road detail panel ──
      if (layerId === mapLayerIds.blockedRoads || layerId === `${mapLayerIds.blockedRoads}-casing`) {
        popupRef.current?.remove();
        setActivePanel(null);
        setActiveReport(null);
        const roadId = String(props.id ?? '');
        const allRoads = dataset.roads ?? (isDemo ? demoRoadSegments : []);
        const found = allRoads.find((r) => r.id === roadId);
        if (found) {
          setActiveRoad(found);
          return;
        }
      }

      // ── Other layers → popup ──
      setActivePanel(null);
      setActiveReport(null);
      setActiveRoad(null);
      const entry = NON_RISK_CLICKABLE.find((c) => c.layerId === layerId);
      if (!entry) return;

      const safeProps = Object.fromEntries(Object.entries(props).map(([key, value]) =>
        [key, typeof value === 'string' ? value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!)) : value]));
      const html = entry.builder({ ...safeProps, dataProvenance: isDemo ? 'Simulated' : 'Live API / cached observations' });
      const coords: [number, number] =
        feature.geometry.type === 'Point'
          ? (feature.geometry.coordinates as [number, number])
          : [e.lngLat.lng, e.lngLat.lat];

      popupRef.current?.remove();
      popupRef.current = new Popup({ closeButton: true, closeOnClick: true, maxWidth: '320px', offset: 12 })
        .setLngLat(coords).setHTML(html).addTo(map);
    };

    clickHandlerRef.current = handleClick;
    mouseMoveHandlerRef.current = handleMouseMove;

    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);
  }, [dataset, isDemo]);

  // ── Route visualization callbacks ────────────────────────────────────────

  const handleRouteSelected = useCallback((coords: [number, number][], mode: RouteResult['mode']) => {
    const map = mapRef.current;
    if (!map) return;
    setActiveRouteMode(mode);

    // Build GeoJSON for line
    const lineFC = {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        id: 'active-route',
        geometry: { type: 'LineString' as const, coordinates: coords },
        properties: { mode },
      }],
    };

    // Origin + destination from first/last coord
    const origin = coords[0];
    const dest   = coords[coords.length - 1];
    const originFC = {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        id: 'route-origin',
        geometry: { type: 'Point' as const, coordinates: origin },
        properties: { label: 'Origin' },
      }],
    };
    const destFC = {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        id: 'route-dest',
        geometry: { type: 'Point' as const, coordinates: dest },
        properties: { label: 'Destination' },
      }],
    };

    addOrUpdateRouteLayers(map, lineFC, originFC, destFC, ROUTE_COLORS[mode] ?? '#22D3EE');

    // Fit map to route bounds
    if (coords.length > 1) {
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      try {
        map.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 80, maxZoom: 12, duration: 600 },
        );
      } catch { /* ignore bounds errors */ }
    }
  }, []);

  const handleDestinationSelected = useCallback((coords: [number, number], safetyScore: number, status: DestinationSafetyStatus) => {
    const map = mapRef.current;
    if (!map) return;

    const STATUS_COLORS: Record<DestinationSafetyStatus, string> = {
      SAFE: '#10B981',
      CAUTION: '#F59E0B',
      HIGH_RISK: '#F97316',
      CRITICAL: '#EF4444',
    };

    const color = STATUS_COLORS[status] || '#10B981';
    addOrUpdateDestinationSafetyLayers(map, coords, color, 8);
  }, []);

  const handleDestinationClear = useCallback(() => {
    const map = mapRef.current;
    if (map) removeDestinationSafetyLayers(map);
  }, []);

  const handleRouteClear = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      removeRouteLayers(map);
      removeDestinationSafetyLayers(map);
      removeJourneyCorridorLayers(map);
    }
    setActiveRouteMode(null);
  }, []);

  const handleCorridorHighlighted = useCallback((points: Array<{ coordinates: [number, number]; risk: string; name: string }>) => {
    const map = mapRef.current;
    if (!map) return;
    if (points.length === 0) {
      removeJourneyCorridorLayers(map);
    } else {
      addOrUpdateJourneyCorridorLayers(map, points);
    }
  }, []);

  const handleToggle     = useCallback((id: string) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, enabled: !l.enabled } : l));
  }, []);
  const handleClosePanel = useCallback(() => {
    setActivePanel(null);
    setActiveReport(null);
    setActiveRoad(null);
  }, []);

  const activeAlerts  = dataset.alerts.filter((a) => a.isActive);
  const criticalCount = activeAlerts.filter((a) => a.severity === 'CRITICAL').length;

  // Compute impact result when we have a multiHazard panel active
  const impactResult: ImpactResult | null =
    activePanel?.type === 'multiHazard'
      ? buildImpact(activePanel.id, activePanel.name, activePanel.explanation)
      : null;

  // Compute shelter planning result for whichever panel is active
  const shelterPlanning: ShelterPlanningResult | null =
    activePanel
      ? buildShelterPlanningForZone({
          zoneId: activePanel.id,
          zoneName: activePanel.name,
          affectedPopulation: activePanel.explanation.result.affectedPopulation,
          severity: activePanel.explanation.result.severity,
          riskScore: activePanel.explanation.result.score,
          allShelters: dataset.shelters,
          allHistoricalEvents: isDemo ? demoHistoricalEvents : [],
        })
      : null;

  // Compute resource requirement planning result for whichever panel is active
  const resourcePlanning: ResourcePlanningResult | null =
    activePanel
      ? buildResourcePlanningForZone({
          zoneId: activePanel.id,
          zoneName: activePanel.name,
          affectedPopulation: activePanel.explanation.result.affectedPopulation,
          severity: activePanel.explanation.result.severity,
          riskScore: activePanel.explanation.result.score,
          dominantHazard:
            activePanel.type === 'cyclone'
              ? 'CYCLONE'
              : activePanel.type === 'flood'
              ? 'FLOOD'
              : activePanel.explanation.result.dominantHazard,
          impactResult,
          shelterPlanning,
          historicalEvents: isDemo ? demoHistoricalEvents : [],
        })
      : null;

  return (
    <MapContainer
      className={className}
      style={mapStyle}
      viewState={{ center: center ?? [85.8, 20.0], zoom: zoom ?? 7.0 }}
      onMapReady={handleMapReady}
    >
      {/* Real / Demo Environment banner — positioned below top-center mode selector */}
      <div className="absolute top-12 sm:top-13 left-0 right-0 flex justify-center pointer-events-none z-20 px-2 sm:px-4">
        {isDemo ? (
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] sm:text-[11px] font-medium backdrop-blur-sm whitespace-nowrap map-panel">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-slow flex-shrink-0" />
            <span className="hidden sm:inline">SIMULATION ENVIRONMENT — </span>Controlling simulated disaster scenario data
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-[11px] font-medium backdrop-blur-sm whitespace-nowrap map-panel">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow flex-shrink-0" />
            <span className="hidden sm:inline">Live API — </span>{getFeedLabel('REAL', feedStatus, dataset.alerts.filter(alert => alert.isActive).length)}
          </div>
        )}
      </div>

      {/* Map tools: Layer control + Basemap selector + Report Incident + Travel Intelligence */}
      <div className="absolute left-2 sm:left-3 top-8 sm:top-10 pointer-events-none z-20 flex flex-col items-start gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Minimizable Map Layers */}
          <LayerControl layers={layers} onToggle={handleToggle} />

          {/* Basemap Switcher (Dark / Light / Streets / Satellite) */}
          <BasemapSelector currentBasemap={basemap} onChangeBasemap={setBasemap} />

          {/* Manual "Locate Me" Control */}
          <button
            type="button"
            onClick={handleManualLocate}
            disabled={geoStatus === 'requesting'}
            className={cn(
              'pointer-events-auto inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md backdrop-blur-md transition-all active:scale-98 border',
              userCoords
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30'
                : 'bg-white/95 dark:bg-surface-elevated/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-overlay border-slate-200 dark:border-white/10'
            )}
            title="Detect & zoom to my current location"
            aria-label="Locate me on map"
          >
            {geoStatus === 'requesting' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span className="hidden xs:inline">
              {geoStatus === 'requesting' ? 'Locating...' : 'Locate Me'}
            </span>
          </button>
        </div>

        {/* Geolocation status message banner (if denied or unavailable) */}
        {geoNotice && (
          <div
            role="status"
            className="pointer-events-auto text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/90 text-amber-300 border border-amber-500/30 backdrop-blur-sm shadow-md animate-fade-in flex items-center gap-1.5"
          >
            <span>⚠️</span>
            <span>{geoNotice}</span>
          </div>
        )}

        {/* Report Incident button */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsReportFormOpen(true)}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-slate-950 hover:bg-accent/90 shadow-lg backdrop-blur-md transition-all active:scale-98 border border-accent/40"
            title="Submit a ground disaster report"
          >
            <span>📢</span>
            <span className="hidden xs:inline">Report Incident</span>
            <span className="xs:hidden">Report</span>
          </button>
        </div>

        {/* Safe Route & Journey Intelligence */}
        <div className="pointer-events-auto">
          <RouteMapOverlay
            environment={envMode}
            onRouteSelected={handleRouteSelected}
            onRouteClear={handleRouteClear}
            onDestinationSelected={handleDestinationSelected}
            onDestinationClear={handleDestinationClear}
            onCorridorHighlighted={handleCorridorHighlighted}
          />
        </div>
      </div>

      {/* Top right container: Weather Widget + Alert badge */}
      <div className="absolute top-8 sm:top-10 right-2 sm:right-3 pointer-events-none z-20 flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2">
        <LiveWeatherWidget
          environment={envMode}
          coordinates={center ?? [85.8, 20.0]}
          locationName={isDemo ? 'Puri Coastal Belt & Town' : 'Odisha Operational Sector'}
        />

        {/* Alert badge */}
        {activeAlerts.length > 0 ? (
          <Link
            href="/alerts"
            className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-surface-elevated/95 border border-critical/30 shadow-lg backdrop-blur-sm map-panel hover:border-critical/60 hover:bg-critical/10 transition-colors"
            title="View all live bulletins and alerts"
          >
            <span className="w-2 h-2 rounded-full bg-critical animate-pulse-slow flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              {activeAlerts.length} Active Alert{activeAlerts.length !== 1 ? 's' : ''}
            </span>
            {criticalCount > 0 && (
              <span className="text-[10px] font-bold text-critical whitespace-nowrap">
                {criticalCount} CRITICAL
              </span>
            )}
          </Link>
        ) : !isDemo ? (
          <Link
            href="/alerts"
            className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-surface-elevated/95 border border-emerald-500/20 shadow-lg backdrop-blur-sm map-panel hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
            title="Inspect alert feed status"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs font-medium text-emerald-400 whitespace-nowrap">
              {getFeedLabel('REAL', feedStatus, 0)}
              <span className="block text-[9px]">Last updated: {lastSuccessfulSync ? new Date(lastSuccessfulSync).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST' : 'Awaiting feed'}</span>
            </span>
          </Link>
        ) : null}
      </div>

      {/* Risk + Impact panel */}
      {activePanel && (
        <div className={cn(
          'absolute z-20 pointer-events-auto',
          'bottom-0 left-0 right-0',
          'md:bottom-auto md:top-12 md:left-auto md:right-3 md:mt-1',
          'overflow-y-auto max-h-[65dvh] md:max-h-[calc(100%-5rem)]',
        )}>
          <DataProvenance model detail="Risk, impact and planning estimates" />
          {activePanel.type === 'multiHazard' ? (
            <div className="flex flex-col rounded-xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-white/10 map-panel">
              {/* Tab bar */}
              <div className="flex bg-slate-100/95 dark:bg-surface-elevated/95 border-b border-slate-200 dark:border-white/10 backdrop-blur-md rounded-t-xl overflow-hidden">
                <button
                  onClick={() => setActiveTab('risk')}
                  className={cn(
                    'flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    activeTab === 'risk'
                      ? 'text-slate-900 dark:text-slate-100 bg-white dark:bg-white/10 shadow-sm dark:shadow-none font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5',
                  )}
                >
                  ⚡ Risk
                </button>
                <button
                  onClick={() => setActiveTab('impact')}
                  className={cn(
                    'flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    activeTab === 'impact'
                      ? 'text-slate-900 dark:text-slate-100 bg-white dark:bg-white/10 shadow-sm dark:shadow-none font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5',
                  )}
                >
                  🎯 Impact
                </button>
                <button
                  onClick={() => setActiveTab('shelter')}
                  className={cn(
                    'flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    activeTab === 'shelter'
                      ? 'text-slate-900 dark:text-slate-100 bg-white dark:bg-white/10 shadow-sm dark:shadow-none font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5',
                  )}
                >
                  ⛺ Shelter
                </button>
                <button
                  onClick={() => setActiveTab('resources')}
                  className={cn(
                    'flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    activeTab === 'resources'
                      ? 'text-slate-900 dark:text-slate-100 bg-white dark:bg-white/10 shadow-sm dark:shadow-none font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5',
                  )}
                >
                  📦 Resources
                </button>
              </div>

              {/* Panel content */}
              {activeTab === 'risk' ? (
                <MultiHazardPanel
                  locationName={activePanel.name}
                  explanation={activePanel.explanation}
                  onClose={handleClosePanel}
                  className="rounded-t-none rounded-b-none md:rounded-b-xl border-none shadow-none"
                />
              ) : activeTab === 'impact' && impactResult ? (
                <ImpactPredictionPanel
                  impact={impactResult}
                  onClose={handleClosePanel}
                  className="rounded-t-none rounded-b-none md:rounded-b-xl border-none shadow-none"
                />
              ) : activeTab === 'resources' && resourcePlanning ? (
                <ResourceRequirementPanel
                  planning={resourcePlanning}
                  onClose={handleClosePanel}
                  className="rounded-t-none rounded-b-none md:rounded-b-xl border-none shadow-none"
                />
              ) : shelterPlanning ? (
                <ShelterRequirementPanel
                  planning={shelterPlanning}
                  onClose={handleClosePanel}
                  className="rounded-t-none rounded-b-none md:rounded-b-xl border-none shadow-none"
                />
              ) : null}
            </div>
          ) : activePanel.type === 'flood' ? (
            <div className="flex flex-col rounded-xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-white/10 map-panel">
              <div className="flex bg-slate-100/95 dark:bg-surface-elevated/95 border-b border-slate-200 dark:border-white/10 backdrop-blur-md rounded-t-xl overflow-hidden">
                <button
                  onClick={() => setActiveTab('risk')}
                  className={cn(
                    'flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    activeTab === 'risk'
                      ? 'text-slate-900 dark:text-slate-100 bg-white dark:bg-white/10 shadow-sm dark:shadow-none font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5',
                  )}
                >
                  ⚡ Risk
                </button>
                <button
                  onClick={() => setActiveTab('shelter')}
                  className={cn(
                    'flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    activeTab === 'shelter'
                      ? 'text-slate-900 dark:text-slate-100 bg-white dark:bg-white/10 shadow-sm dark:shadow-none font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5',
                  )}
                >
                  ⛺ Shelter
                </button>
                <button
                  onClick={() => setActiveTab('resources')}
                  className={cn(
                    'flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    activeTab === 'resources'
                      ? 'text-slate-900 dark:text-slate-100 bg-white dark:bg-white/10 shadow-sm dark:shadow-none font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5',
                  )}
                >
                  📦 Resources
                </button>
              </div>
              {activeTab === 'resources' && resourcePlanning ? (
                <ResourceRequirementPanel
                  planning={resourcePlanning}
                  onClose={handleClosePanel}
                  className="rounded-t-none rounded-b-none md:rounded-b-xl border-none shadow-none"
                />
              ) : activeTab === 'shelter' && shelterPlanning ? (
                <ShelterRequirementPanel
                  planning={shelterPlanning}
                  onClose={handleClosePanel}
                  className="rounded-t-none rounded-b-none md:rounded-b-xl border-none shadow-none"
                />
              ) : (
                <FloodRiskPanel
                  zoneName={activePanel.name}
                  explanation={activePanel.explanation}
                  onClose={handleClosePanel}
                  className="rounded-t-none rounded-b-none md:rounded-b-xl border-none shadow-none"
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col rounded-xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-white/10 map-panel">
              <div className="flex bg-slate-100/95 dark:bg-surface-elevated/95 border-b border-slate-200 dark:border-white/10 backdrop-blur-md rounded-t-xl overflow-hidden">
                <button
                  onClick={() => setActiveTab('risk')}
                  className={cn(
                    'flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    activeTab === 'risk'
                      ? 'text-slate-900 dark:text-slate-100 bg-white dark:bg-white/10 shadow-sm dark:shadow-none font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5',
                  )}
                >
                  ⚡ Risk
                </button>
                <button
                  onClick={() => setActiveTab('shelter')}
                  className={cn(
                    'flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    activeTab === 'shelter'
                      ? 'text-slate-900 dark:text-slate-100 bg-white dark:bg-white/10 shadow-sm dark:shadow-none font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5',
                  )}
                >
                  ⛺ Shelter
                </button>
                <button
                  onClick={() => setActiveTab('resources')}
                  className={cn(
                    'flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    activeTab === 'resources'
                      ? 'text-slate-900 dark:text-slate-100 bg-white dark:bg-white/10 shadow-sm dark:shadow-none font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5',
                  )}
                >
                  📦 Resources
                </button>
              </div>
              {activeTab === 'resources' && resourcePlanning ? (
                <ResourceRequirementPanel
                  planning={resourcePlanning}
                  onClose={handleClosePanel}
                  className="rounded-t-none rounded-b-none md:rounded-b-xl border-none shadow-none"
                />
              ) : activeTab === 'shelter' && shelterPlanning ? (
                <ShelterRequirementPanel
                  planning={shelterPlanning}
                  onClose={handleClosePanel}
                  className="rounded-t-none rounded-b-none md:rounded-b-xl border-none shadow-none"
                />
              ) : (
                <CycloneRiskPanel
                  zoneName={activePanel.name}
                  explanation={activePanel.explanation}
                  onClose={handleClosePanel}
                  className="rounded-t-none rounded-b-none md:rounded-b-xl border-none shadow-none"
                />
              )}
            </div>
          )}

        </div>
      )}

      {/* Citizen Report Detail Panel */}
      {activeReport && (
        <div className={cn(
          'absolute z-20 pointer-events-auto',
          'bottom-0 left-0 right-0',
          'md:bottom-auto md:top-12 md:left-auto md:right-3 md:mt-1',
          'overflow-y-auto max-h-[75dvh] md:max-h-[calc(100%-4rem)]',
        )}>
          <ReportDetailPanel
            report={activeReport}
            onClose={() => setActiveReport(null)}
            onUpdateReport={(updated) => setActiveReport(updated)}
          />
        </div>
      )}

      {/* Road Intelligence Detail Panel */}
      {activeRoad && (
        <div className={cn(
          'absolute z-20 pointer-events-auto',
          'bottom-0 left-0 right-0',
          'md:bottom-auto md:top-12 md:left-auto md:right-3 md:mt-1',
          'overflow-y-auto max-h-[75dvh] md:max-h-[calc(100%-4rem)]',
        )}>
          <RoadDetailPanel
            road={activeRoad}
            onClose={() => setActiveRoad(null)}
            relatedCitizenReports={dataset.citizenReports ? (dataset.citizenReports as unknown as CitizenReportItem[]) : demoCitizenReports}
            onSelectReport={(rep) => {
              setActiveRoad(null);
              setActiveReport(rep);
            }}
            onUpdateRoad={(updated) => {
              setActiveRoad(updated);
            }}
          />
        </div>
      )}

      {/* Citizen Report Form Modal — safely below navbar without top cutoff */}
      {isReportFormOpen && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm overflow-y-auto flex items-start justify-center p-2.5 sm:p-4 md:p-6 pt-16 sm:pt-20 pb-8 pointer-events-auto animate-fade-in">
          <div className="w-full max-w-2xl my-2 sm:my-4 flex flex-col">
            <CitizenReportForm
              onViewOnMap={(report) => {
                setIsReportFormOpen(false);
                setLayers((prev) =>
                  prev.map((l) => (l.id === 'reports' ? { ...l, enabled: true } : l)),
                );
                if (mapRef.current) {
                  mapRef.current.flyTo({
                    center: report.coordinates,
                    zoom: 13,
                    speed: 1.2,
                  });
                }
                setActiveReport(report);
              }}
              onCancel={() => setIsReportFormOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={cn(
        'absolute left-3 pointer-events-none z-10',
        activePanel || activeReport || activeRoad ? 'hidden md:block bottom-8' : 'bottom-8',
      )}>
        <MapLegend />
      </div>
    </MapContainer>
  );
}
