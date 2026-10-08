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

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import { MapContainer } from './MapContainer';
import { LayerControl, type LayerToggle } from './LayerControl';
import { BasemapSelector } from './BasemapSelector';
import { LiveWeatherWidget } from './LiveWeatherWidget';
import { MapLegend } from './MapLegend';
import { FloodRiskPanel } from '@/components/risk/FloodRiskPanel';
import { CycloneRiskPanel } from '@/components/risk/CycloneRiskPanel';
import { MultiHazardPanel } from '@/components/risk/MultiHazardPanel';
import { ImpactPredictionPanel } from '@/components/impact/ImpactPredictionPanel';
import { ShelterRequirementPanel } from '@/components/planning/ShelterRequirementPanel';
import { buildShelterPlanningForZone, type ShelterPlanningResult } from '@/lib/planning/shelter';
import { ResourceRequirementPanel } from '@/components/planning/ResourceRequirementPanel';
import { buildResourcePlanningForZone, type ResourcePlanningResult } from '@/lib/planning/resources';
import { ReportDetailPanel } from '@/components/reports/ReportDetailPanel';
import { CitizenReportForm } from '@/components/reports/CitizenReportForm';
import { RoadDetailPanel } from '@/components/roads/RoadDetailPanel';
import { RouteMapOverlay } from '@/components/routing/RouteMapOverlay';
import { createCitizenReport, type CitizenReportItem } from '@/lib/reports';
import { demoCitizenReports } from '@/data/demo/citizenReports';
import {
  addOrUpdateRouteLayers,
  removeRouteLayers,
  addOrUpdateDestinationSafetyLayers,
  removeDestinationSafetyLayers,
} from './layers/addLayers';
import type { RouteResult } from '@/lib/routing/types';
import type { DestinationSafetyStatus } from '@/lib/destination/types';
import { demoRoadSegments } from '@/data/demo';
import type { RoadSegment } from '@/lib/roads/types';
import { mapLayerIds, getBasemapStyle, type BasemapStyleId } from '@/config/map';
import { useTheme } from '@/context/ThemeContext';
import {
  riskZonesToGeoJSON,
  floodAreasToGeoJSON,
  sheltersToGeoJSON,
  alertsToGeoJSON,
  infrastructureToGeoJSON,
  blockedRoadsToGeoJSON,
  roadSegmentsToGeoJSON,
  citizenReportsToGeoJSON,
  cycloneZonesToGeoJSON,
  cycloneTrackToGeoJSON,
  cycloneLandfallToGeoJSON,
  historicalEventsToGeoJSON,
} from '@/data/geojson';
import {
  addRiskZoneLayers,
  addFloodAreaLayers,
  addShelterLayers,
  addAlertLayers,
  addInfrastructureLayers,
  addBlockedRoadLayers,
  addCitizenReportLayers,
  addCycloneZoneLayers,
  addCycloneTrackLayers,
  addHistoricalEventLayers,
  addOrUpdateJourneyCorridorLayers,
  removeJourneyCorridorLayers,
} from './layers/addLayers';
import {
  floodAreaPopupHTML,
  shelterPopupHTML,
  alertPopupHTML,
  infrastructurePopupHTML,
  blockedRoadPopupHTML,
  citizenReportPopupHTML,
  historicalEventPopupHTML,
} from './layers/popups';
import type { DisasterDataset } from '@/data/types';
import type { FloodRiskExplanation } from '@/lib/risk/flood';
import type { CycloneRiskExplanation } from '@/lib/risk/cyclone';
import type { MultiHazardRiskExplanation } from '@/lib/risk/multiHazard';
import type { ImpactResult } from '@/lib/impact';
import { calculateImpact, DEMO_ZONE_EXPOSURE, fallbackExposure } from '@/lib/impact';
import { computedFloodRisks }        from '@/data/demo/computedFloodRisks';
import { computedCycloneRisks }      from '@/data/demo/computedCycloneRisks';
import {
  computedMultiHazardRisks,
  ZONE_TO_MULTI_HAZARD_ID,
} from '@/data/demo/computedMultiHazardRisks';
import { demoCycloneZones, demoCycloneTrack } from '@/data/demo/cycloneZones';
import { demoHistoricalEvents } from '@/data/demo/historicalEvents';
import { cn } from '@/lib/utils';

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
  const [activeTab, setActiveTab]     = useState<ZoneDetailTab>('risk');
  const [, setActiveRouteMode] = useState<RouteResult['mode'] | null>(null);
  const mapRef                        = useRef<MLMap | null>(null);
  const popupRef                      = useRef<import('maplibre-gl').Popup | null>(null);
  const prevLayers                    = useRef<LayerToggle[]>(initialLayers ?? INITIAL_LAYERS);
  const layersRef                     = useRef<LayerToggle[]>(initialLayers ?? INITIAL_LAYERS);
  const clickHandlerRef               = useRef<((e: any) => void) | null>(null);
  const mouseMoveHandlerRef           = useRef<((e: any) => void) | null>(null);

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

      // ── Road network clicked → open road detail panel (Task 12) ──
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

      const html   = entry.builder(props);
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
      {/* Real / Demo Environment banner */}
      <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-20 px-4">
        {isDemo ? (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-medium backdrop-blur-sm whitespace-nowrap map-panel">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-slow flex-shrink-0" />
            SIMULATION ENVIRONMENT — Controlling simulated disaster scenario data
          </div>
        ) : (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium backdrop-blur-sm whitespace-nowrap map-panel">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow flex-shrink-0" />
            OPERATIONAL ENVIRONMENT — Live Feed Active · India Geographic Monitoring
          </div>
        )}
      </div>

      {/* Map tools: Layer control + Basemap selector + Report Incident + Travel Intelligence */}
      <div className="absolute left-3 top-4 pointer-events-none z-20 flex flex-col items-start gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Minimizable Map Layers */}
          <LayerControl layers={layers} onToggle={handleToggle} />

          {/* Basemap Switcher (Dark / Light / Streets / Satellite) */}
          <BasemapSelector currentBasemap={basemap} onChangeBasemap={setBasemap} />
        </div>

        {/* Report Incident button */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsReportFormOpen(true)}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-slate-950 hover:bg-accent/90 shadow-lg backdrop-blur-md transition-all active:scale-98 border border-accent/40"
            title="Submit a ground disaster report"
          >
            <span>📢</span>
            <span>Report Incident</span>
          </button>
        </div>

        {/* Task 13 + 14 + 15: Route, Destination & Journey Intelligence */}
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
      <div className="absolute top-4 right-3 pointer-events-none z-20 flex items-center gap-2">
        <LiveWeatherWidget
          environment={envMode}
          coordinates={center ?? [85.8, 20.0]}
          locationName={isDemo ? 'Puri Coastal Belt & Town' : 'Odisha Operational Sector'}
        />

        {/* Alert badge */}
        {activeAlerts.length > 0 ? (
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated/95 border border-white/10 shadow-lg backdrop-blur-sm map-panel">
            <span className="w-2 h-2 rounded-full bg-critical animate-pulse-slow flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              {activeAlerts.length} Active Alert{activeAlerts.length !== 1 ? 's' : ''}
            </span>
            {criticalCount > 0 && (
              <span className="text-[10px] font-bold text-critical whitespace-nowrap">
                {criticalCount} CRITICAL
              </span>
            )}
          </div>
        ) : !isDemo ? (
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated/95 border border-emerald-500/20 shadow-lg backdrop-blur-sm map-panel">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs font-medium text-emerald-400 whitespace-nowrap">
              0 Active Alerts · All Sectors Normal
            </span>
          </div>
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

      {/* Road Intelligence Detail Panel (Task 12) */}
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

      {/* Citizen Report Form Modal */}
      {isReportFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pointer-events-auto animate-fade-in">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto">
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
