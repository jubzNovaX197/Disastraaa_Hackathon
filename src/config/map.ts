import type { StyleSpecification } from 'maplibre-gl';

export type BasemapStyleId = 'dark' | 'light' | 'streets' | 'satellite';

export interface BasemapOption {
  id: BasemapStyleId;
  label: string;
  icon: string;
  attribution: string;
}

export const BASEMAP_OPTIONS: BasemapOption[] = [
  {
    id: 'dark',
    label: 'Dark',
    icon: '🌙',
    attribution: '© CARTO, © OpenStreetMap contributors',
  },
  {
    id: 'light',
    label: 'Light',
    icon: '☀️',
    attribution: '© CARTO, © OpenStreetMap contributors',
  },
  {
    id: 'streets',
    label: 'Streets',
    icon: '🗺️',
    attribution: '© CARTO Voyager, © OpenStreetMap contributors',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    icon: '🛰️',
    attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS Community',
  },
];

/** Official ESRI World Imagery raster tiles (sub-meter resolution, no API key required) */
export const SATELLITE_BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-world-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    },
    'esri-world-reference': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'esri-imagery-layer',
      type: 'raster',
      source: 'esri-world-imagery',
      minzoom: 0,
      maxzoom: 22,
    },
    {
      id: 'esri-reference-layer',
      type: 'raster',
      source: 'esri-world-reference',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 0.85,
      },
    },
  ],
};

/** Resolve the correct map tile style URL or Specification by basemap ID */
export function getBasemapStyle(styleId: BasemapStyleId): string | StyleSpecification {
  switch (styleId) {
    case 'satellite':
      return SATELLITE_BASEMAP_STYLE;
    case 'light':
      return mapConfig.lightStyle;
    case 'streets':
      return mapConfig.streetsStyle;
    case 'dark':
    default:
      return mapConfig.darkStyle;
  }
}

/** Resolve the correct map tile style URL by theme */
export function getMapStyleForTheme(theme: 'dark' | 'light'): string {
  return theme === 'light' ? mapConfig.lightStyle : mapConfig.darkStyle;
}

function resolveMapStyle(): string {
  return mapConfig.darkStyle;
}

export const mapConfig = {
  /**
   * Dark tile style URL (CARTO Dark Matter — no API key required).
   * Override via NEXT_PUBLIC_MAP_STYLE_URL.
   */
  darkStyle:
    (process.env.NEXT_PUBLIC_MAP_STYLE_URL as string | undefined) ??
    'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',

  /**
   * Light tile style URL (CARTO Positron — no API key required).
   * Override via NEXT_PUBLIC_MAP_STYLE_LIGHT_URL.
   */
  lightStyle:
    (process.env.NEXT_PUBLIC_MAP_STYLE_LIGHT_URL as string | undefined) ??
    'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',

  /**
   * Streets tile style URL (CARTO Voyager — no API key required).
   * Override via NEXT_PUBLIC_MAP_STYLE_STREETS_URL.
   */
  streetsStyle:
    (process.env.NEXT_PUBLIC_MAP_STYLE_STREETS_URL as string | undefined) ??
    'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',

  /**
   * Resolved at call-time based on OS colour-scheme preference.
   * Must only be called in a browser context (i.e. inside useEffect).
   */
  get defaultStyle(): string {
    return resolveMapStyle();
  },

  /** Default map centre — geographic centre of India [lng, lat] */
  defaultCenter: [82.8, 22.5] as [number, number],

  /** Default zoom level to show all of India */
  defaultZoom: 4.5,

  /** Zoom range */
  minZoom: 3,
  maxZoom: 18,

  /** Built-in control visibility */
  controls: {
    navigation: true,
    scale: true,
    fullscreen: false,
    attribution: true,
  },
};

/**
 * Canonical layer IDs used across the application.
 *
 * Reference these constants instead of inline strings so that
 * renaming a layer requires a single change here.
 */
export const mapLayerIds = {
  // Risk
  riskZoneFill:    'risk-zone-fill',
  riskZoneOutline: 'risk-zone-outline',

  // Infrastructure
  shelters:     'shelters-points',
  hospitals:    'hospitals-points',
  roads:        'roads-line',
  blockedRoads: 'blocked-roads-line',

  // Events & reports
  hazardEvents:   'hazard-events-fill',
  citizenReports: 'citizen-reports-points',
  alerts:         'alerts-points',

  // Cyclone
  cycloneZoneFill:    'cyclone-zone-fill',
  cycloneZoneOutline: 'cyclone-zone-outline',
  cycloneTrack:       'cyclone-track-line',
  cycloneLandfall:    'cyclone-landfall-point',

  // Historical events
  historicalEvents: 'historical-events-points',

  // Routing (Task 13)
  routeLine:        'route-line',
  routeLineCasing:  'route-line-casing',
  routeOrigin:      'route-origin-point',
  routeDestination: 'route-destination-point',

  // Destination Safety (Task 14)
  destSafetyRadiusFill:    'dest-safety-radius-fill',
  destSafetyRadiusOutline: 'dest-safety-radius-outline',
  destSafetyMarker:        'dest-safety-marker',

  // Journey Intelligence (Task 15)
  journeyCorridorPoints:   'journey-corridor-points',
  journeyCorridorBuffer:   'journey-corridor-buffer',
} as const;

export type MapLayerId = (typeof mapLayerIds)[keyof typeof mapLayerIds];
