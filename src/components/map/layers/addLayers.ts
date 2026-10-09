/**
 * MapLibre layer registration helpers.
 *
 * Each function adds sources + layers to an existing MapLibre map instance.
 * They are designed to be idempotent — calling twice will not throw.
 *
 * Only import these inside 'use client' components (never in RSC/SSR).
 */


import { mapLayerIds } from '@/config/map';
import type {
  FeatureCollection,
  GeoJsonProperties,
  LineString,
  Point,
  Polygon,
} from 'geojson';
import type { ExpressionSpecification, GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import {
  blockedRoadColorExpr,
  infraColorExpr,
  reportStatusColorExpr,
  severityColorExpr,
  severityOpacityExpr,
  shelterStatusColorExpr,
} from './styles';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasSource(map: MLMap, id: string): boolean {
  return !!map.getSource(id);
}

function hasLayer(map: MLMap, id: string): boolean {
  return !!map.getLayer(id);
}

function addOrUpdateSource(
  map: MLMap,
  id: string,
  data: FeatureCollection,
): void {
  if (hasSource(map, id)) {
    (map.getSource(id) as GeoJSONSource).setData(data);
  } else {
    map.addSource(id, { type: 'geojson', data });
  }
}

// ── Risk Zones ────────────────────────────────────────────────────────────────

export function addRiskZoneLayers(
  map: MLMap,
  data: FeatureCollection<Polygon, GeoJsonProperties>,
): void {
  addOrUpdateSource(map, 'risk-zones', data);

  if (!hasLayer(map, mapLayerIds.riskZoneFill)) {
    map.addLayer({
      id: mapLayerIds.riskZoneFill,
      type: 'fill',
      source: 'risk-zones',
      paint: {
        'fill-color': severityColorExpr(),
        'fill-opacity': severityOpacityExpr(0.18),
      },
    });
  }

  if (!hasLayer(map, mapLayerIds.riskZoneOutline)) {
    map.addLayer({
      id: mapLayerIds.riskZoneOutline,
      type: 'line',
      source: 'risk-zones',
      paint: {
        'line-color': severityColorExpr(),
        'line-width': ['match', ['get', 'severity'], 'CRITICAL', 2.5, 'HIGH', 2, 'MODERATE', 1.5, 1] as ExpressionSpecification,
        'line-opacity': 0.8,
        'line-dasharray': [3, 2],
      },
    });
  }
}

// ── Flood / Hazard Areas ──────────────────────────────────────────────────────

export function addFloodAreaLayers(
  map: MLMap,
  data: FeatureCollection<Polygon, GeoJsonProperties>,
): void {
  addOrUpdateSource(map, 'flood-areas', data);

  if (!hasLayer(map, mapLayerIds.hazardEvents)) {
    map.addLayer({
      id: mapLayerIds.hazardEvents,
      type: 'fill',
      source: 'flood-areas',
      paint: {
        'fill-color': severityColorExpr(),
        'fill-opacity': severityOpacityExpr(0.35),
        'fill-antialias': true,
      },
    });
  }

  const outlineId = `${mapLayerIds.hazardEvents}-outline`;
  if (!hasLayer(map, outlineId)) {
    map.addLayer({
      id: outlineId,
      type: 'line',
      source: 'flood-areas',
      paint: {
        'line-color': severityColorExpr(),
        'line-width': 2,
        'line-opacity': 0.9,
      },
    });
  }
}

// ── Shelters ──────────────────────────────────────────────────────────────────

export function addShelterLayers(
  map: MLMap,
  data:FeatureCollection<Point, GeoJsonProperties>,
): void {
  addOrUpdateSource(map, 'shelters', data);

  if (!hasLayer(map, mapLayerIds.shelters)) {
    map.addLayer({
      id: mapLayerIds.shelters,
      type: 'circle',
      source: 'shelters',
      paint: {
        'circle-color': shelterStatusColorExpr(),
        'circle-radius': 9,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#0E1422',
        'circle-opacity': 0.95,
      },
    });
  }

  const labelId = `${mapLayerIds.shelters}-label`;
  if (!hasLayer(map, labelId)) {
    map.addLayer({
      id: labelId,
      type: 'symbol',
      source: 'shelters',
      layout: {
        'text-field': '⛺',
        'text-size': 12,
        'text-offset': [0, 0],
        'text-allow-overlap': false,
      },
    });
  }
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export function addAlertLayers(
  map: MLMap,
  data: FeatureCollection<Point, GeoJsonProperties>,
): void {
  addOrUpdateSource(map, 'alerts', data);

  // Pulsing halo
  const haloId = `${mapLayerIds.alerts}-halo`;
  if (!hasLayer(map, haloId)) {
    map.addLayer({
      id: haloId,
      type: 'circle',
      source: 'alerts',
      paint: {
        'circle-color': severityColorExpr(),
        'circle-radius': 18,
        'circle-opacity': 0.15,
        'circle-stroke-width': 0,
      },
    });
  }

  if (!hasLayer(map, mapLayerIds.alerts)) {
    map.addLayer({
      id: mapLayerIds.alerts,
      type: 'circle',
      source: 'alerts',
      paint: {
        'circle-color': severityColorExpr(),
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#0E1422',
        'circle-opacity': 1,
      },
    });
  }
}

// ── Infrastructure ────────────────────────────────────────────────────────────

export function addInfrastructureLayers(
  map: MLMap,
  data: FeatureCollection<Point, GeoJsonProperties>,
): void {
  addOrUpdateSource(map, 'infrastructure', data);

  if (!hasLayer(map, mapLayerIds.hospitals)) {
    map.addLayer({
      id: mapLayerIds.hospitals,
      type: 'circle',
      source: 'infrastructure',
      paint: {
        'circle-color': infraColorExpr(),
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#0E1422',
        'circle-opacity': 0.95,
      },
    });
  }
}

// ── Blocked Roads ─────────────────────────────────────────────────────────────

export function addBlockedRoadLayers(
  map: MLMap,
  data: FeatureCollection<LineString, GeoJsonProperties>,
): void {
  addOrUpdateSource(map, 'blocked-roads', data);

  // Casing rendered BELOW the main dashed line
  const casingId = `${mapLayerIds.blockedRoads}-casing`;
  if (!hasLayer(map, casingId)) {
    map.addLayer({
      id: casingId,
      type: 'line',
      source: 'blocked-roads',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0E1422',
        'line-width': 9,
        'line-opacity': 0.5,
      },
    });
  }

  if (!hasLayer(map, mapLayerIds.blockedRoads)) {
    map.addLayer({
      id: mapLayerIds.blockedRoads,
      type: 'line',
      source: 'blocked-roads',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': blockedRoadColorExpr(),
        'line-width': 5,
        'line-dasharray': [2, 2],
        'line-opacity': 0.9,
      },
    });
  }
}

// ── Cyclone Zones ────────────────────────────────────────────────────────────

export function addCycloneZoneLayers(
  map: MLMap,
  data: FeatureCollection<Polygon, GeoJsonProperties>,
): void {
  addOrUpdateSource(map, 'cyclone-zones', data);

  if (!hasLayer(map, mapLayerIds.cycloneZoneFill)) {
    map.addLayer({
      id: mapLayerIds.cycloneZoneFill,
      type: 'fill',
      source: 'cyclone-zones',
      paint: {
        'fill-color': severityColorExpr(),
        'fill-opacity': severityOpacityExpr(0.22),
      },
    });
  }

  if (!hasLayer(map, mapLayerIds.cycloneZoneOutline)) {
    map.addLayer({
      id: mapLayerIds.cycloneZoneOutline,
      type: 'line',
      source: 'cyclone-zones',
      paint: {
        'line-color': severityColorExpr(),
        'line-width': ['match', ['get', 'severity'], 'CRITICAL', 2.5, 'HIGH', 2, 'MODERATE', 1.5, 1] as ExpressionSpecification,
        'line-opacity': 0.85,
        'line-dasharray': [4, 2],
      },
    });
  }
}

// ── Cyclone Track + Landfall ──────────────────────────────────────────────────

export function addCycloneTrackLayers(
  map: MLMap,
  trackData: FeatureCollection<LineString, GeoJsonProperties>,
  landfallData: FeatureCollection<Point, GeoJsonProperties>,
): void {
  addOrUpdateSource(map, 'cyclone-track', trackData);
  addOrUpdateSource(map, 'cyclone-landfall', landfallData);

  const trackCasingId = `${mapLayerIds.cycloneTrack}-casing`;
  if (!hasLayer(map, trackCasingId)) {
    map.addLayer({
      id: trackCasingId,
      type: 'line',
      source: 'cyclone-track',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#7C3AED',
        'line-width': 7,
        'line-opacity': 0.25,
      },
    });
  }

  if (!hasLayer(map, mapLayerIds.cycloneTrack)) {
    map.addLayer({
      id: mapLayerIds.cycloneTrack,
      type: 'line',
      source: 'cyclone-track',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#A78BFA',
        'line-width': 3,
        'line-dasharray': [2, 1.5],
        'line-opacity': 0.95,
      },
    });
  }

  if (!hasLayer(map, mapLayerIds.cycloneLandfall)) {
    map.addLayer({
      id: mapLayerIds.cycloneLandfall,
      type: 'circle',
      source: 'cyclone-landfall',
      paint: {
        'circle-color': '#EF4444',
        'circle-radius': 10,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#FCA5A5',
        'circle-opacity': 0.95,
      },
    });
  }
}

// ── Historical Events ────────────────────────────────────────────────────────

export function addHistoricalEventLayers(
  map: MLMap,
  data: FeatureCollection<Point, GeoJsonProperties>,
): void {
  addOrUpdateSource(map, 'historical-events', data);

  // Outer ring (severity-coloured outline, transparent fill)
  if (!hasLayer(map, mapLayerIds.historicalEvents)) {
    map.addLayer({
      id: mapLayerIds.historicalEvents,
      type: 'circle',
      source: 'historical-events',
      paint: {
        'circle-color':          '#000000',
        'circle-opacity':        0,
        'circle-radius':         11,
        'circle-stroke-width':   2.5,
        'circle-stroke-color':   severityColorExpr() as ExpressionSpecification,
        'circle-stroke-opacity': 0.85,
      },
    });
  }

  // Inner filled dot
  const dotId = `${mapLayerIds.historicalEvents}-dot`;
  if (!hasLayer(map, dotId)) {
    map.addLayer({
      id: dotId,
      type: 'circle',
      source: 'historical-events',
      paint: {
        'circle-color':        severityColorExpr() as ExpressionSpecification,
        'circle-radius':       4,
        'circle-opacity':      0.65,
        'circle-stroke-width': 0,
      },
    });
  }
}

// ── Citizen Reports ───────────────────────────────────────────────────────────

export function addCitizenReportLayers(
  map: MLMap,
  data: FeatureCollection<Point, GeoJsonProperties>,
): void {
  addOrUpdateSource(map, 'citizen-reports', data);

  if (!hasLayer(map, mapLayerIds.citizenReports)) {
    map.addLayer({
      id: mapLayerIds.citizenReports,
      type: 'circle',
      source: 'citizen-reports',
      paint: {
        'circle-color': reportStatusColorExpr(),
        'circle-radius': 7,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#0E1422',
        'circle-opacity': 0.9,
      },
    });
  }
}

// ── Route layers (Task 13) ──────────────────────────────────────────────────────────────

/**
 * Adds / updates the active route line and origin/destination markers.
 * Designed to be called every time a new route is selected.
 * Does NOT preserve previous route state.
 */
export function addOrUpdateRouteLayers(
  map: MLMap,
  lineData: FeatureCollection<LineString, GeoJsonProperties>,
  originData: FeatureCollection<Point, GeoJsonProperties>,
  destData: FeatureCollection<Point, GeoJsonProperties>,
  color: string,
): void {
  // Route line source
  addOrUpdateSource(map, 'route-line', lineData);
  addOrUpdateSource(map, 'route-origin', originData);
  addOrUpdateSource(map, 'route-dest', destData);

  // Casing (renders below)
  if (!hasLayer(map, mapLayerIds.routeLineCasing)) {
    map.addLayer({
      id: mapLayerIds.routeLineCasing,
      type: 'line',
      source: 'route-line',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#000000',
        'line-width': 10,
        'line-opacity': 0.3,
      },
    });
  }

  // Main route line
  if (!hasLayer(map, mapLayerIds.routeLine)) {
    map.addLayer({
      id: mapLayerIds.routeLine,
      type: 'line',
      source: 'route-line',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': color,
        'line-width': 4,
        'line-opacity': 0.92,
      },
    });
  } else {
    map.setPaintProperty(mapLayerIds.routeLine, 'line-color', color);
  }

  // Origin marker
  if (!hasLayer(map, mapLayerIds.routeOrigin)) {
    map.addLayer({
      id: mapLayerIds.routeOrigin,
      type: 'circle',
      source: 'route-origin',
      paint: {
        'circle-color': '#22D3EE',
        'circle-radius': 9,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#0E1422',
        'circle-opacity': 1,
      },
    });
  }

  // Destination marker
  if (!hasLayer(map, mapLayerIds.routeDestination)) {
    map.addLayer({
      id: mapLayerIds.routeDestination,
      type: 'circle',
      source: 'route-dest',
      paint: {
        'circle-color': '#10B981',
        'circle-radius': 9,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#0E1422',
        'circle-opacity': 1,
      },
    });
  }
}

/** Remove all route layers and sources cleanly */
export function removeRouteLayers(map: MLMap): void {
  const layerIds = [
    mapLayerIds.routeLine,
    mapLayerIds.routeLineCasing,
    mapLayerIds.routeOrigin,
    mapLayerIds.routeDestination,
  ];
  for (const id of layerIds) {
    if (hasLayer(map, id)) map.removeLayer(id);
  }
  for (const src of ['route-line', 'route-origin', 'route-dest']) {
    if (hasSource(map, src)) map.removeSource(src);
  }
}

/**
 * Create a GeoJSON polygon approximating a circle around a center point [lng, lat]
 */
export function createCircleGeoJSON(center: [number, number], radiusKm: number, points: number = 48) {
  const coords: [number, number][] = [];
  const distanceX = radiusKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }

  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        id: 'dest-safety-radius-feature',
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coords],
        },
        properties: {},
      },
    ],
  };
}

/**
 * Add or update destination safety radius and marker layers (Task 14)
 */
export function addOrUpdateDestinationSafetyLayers(
  map: MLMap,
  center: [number, number],
  color: string,
  radiusKm: number = 8,
): void {
  const radiusData = createCircleGeoJSON(center, radiusKm);
  const pointData = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        id: 'dest-safety-point-feature',
        geometry: { type: 'Point' as const, coordinates: center },
        properties: {},
      },
    ],
  };

  addOrUpdateSource(map, 'dest-safety-radius', radiusData as any);
  addOrUpdateSource(map, 'dest-safety-marker', pointData as any);

  // Buffer fill
  if (!hasLayer(map, mapLayerIds.destSafetyRadiusFill)) {
    map.addLayer({
      id: mapLayerIds.destSafetyRadiusFill,
      type: 'fill',
      source: 'dest-safety-radius',
      paint: {
        'fill-color': color,
        'fill-opacity': 0.18,
      },
    });
  } else {
    map.setPaintProperty(mapLayerIds.destSafetyRadiusFill, 'fill-color', color);
  }

  // Buffer outline
  if (!hasLayer(map, mapLayerIds.destSafetyRadiusOutline)) {
    map.addLayer({
      id: mapLayerIds.destSafetyRadiusOutline,
      type: 'line',
      source: 'dest-safety-radius',
      paint: {
        'line-color': color,
        'line-width': 2,
        'line-dasharray': [3, 2],
        'line-opacity': 0.85,
      },
    });
  } else {
    map.setPaintProperty(mapLayerIds.destSafetyRadiusOutline, 'line-color', color);
  }

  // Destination pulsing beacon
  if (!hasLayer(map, mapLayerIds.destSafetyMarker)) {
    map.addLayer({
      id: mapLayerIds.destSafetyMarker,
      type: 'circle',
      source: 'dest-safety-marker',
      paint: {
        'circle-color': color,
        'circle-radius': 11,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#0E1422',
        'circle-opacity': 1,
      },
    });
  } else {
    map.setPaintProperty(mapLayerIds.destSafetyMarker, 'circle-color', color);
  }
}

/** Remove destination safety layers cleanly */
export function removeDestinationSafetyLayers(map: MLMap): void {
  const layerIds = [
    mapLayerIds.destSafetyRadiusFill,
    mapLayerIds.destSafetyRadiusOutline,
    mapLayerIds.destSafetyMarker,
  ];
  for (const id of layerIds) {
    if (hasLayer(map, id)) map.removeLayer(id);
  }
  for (const src of ['dest-safety-radius', 'dest-safety-marker']) {
    if (hasSource(map, src)) map.removeSource(src);
  }
}

/**
 * Add or update Journey Corridor hazard highlight layers (Task 15)
 */
export function addOrUpdateJourneyCorridorLayers(
  map: MLMap,
  corridorPoints: Array<{ coordinates: [number, number]; risk: string; name: string }>,
): void {
  const features = corridorPoints.map((pt, i) => ({
    type: 'Feature' as const,
    id: `journey-corridor-pt-${i}`,
    geometry: { type: 'Point' as const, coordinates: pt.coordinates },
    properties: {
      name: pt.name,
      risk: pt.risk,
      color:
        pt.risk === 'CRITICAL'
          ? '#EF4444'
          : pt.risk === 'HIGH'
          ? '#F97316'
          : pt.risk === 'MODERATE'
          ? '#F59E0B'
          : '#10B981',
    },
  }));

  const data = {
    type: 'FeatureCollection' as const,
    features,
  };

  addOrUpdateSource(map, 'journey-corridor', data as any);

  if (!hasLayer(map, mapLayerIds.journeyCorridorPoints)) {
    map.addLayer({
      id: mapLayerIds.journeyCorridorPoints,
      type: 'circle',
      source: 'journey-corridor',
      paint: {
        'circle-color': ['get', 'color'] as any,
        'circle-radius': 7.5,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#0E1422',
        'circle-opacity': 0.9,
      },
    });
  }
}

/** Remove journey corridor layers cleanly */
export function removeJourneyCorridorLayers(map: MLMap): void {
  if (hasLayer(map, mapLayerIds.journeyCorridorPoints)) {
    map.removeLayer(mapLayerIds.journeyCorridorPoints);
  }
  if (hasSource(map, 'journey-corridor')) {
    map.removeSource('journey-corridor');
  }
}

