import type { StyleSpecification } from 'maplibre-gl';

/** Initial view state for the map */
export interface MapViewState {
  /** [longitude, latitude] */
  center:   [number, number];
  zoom:     number;
  bearing?: number;
  pitch?:   number;
}

/** Props for the MapContainer component */
export interface MapContainerProps {
  viewState?:   Partial<MapViewState>;
  /** MapLibre style URL or inline StyleSpecification */
  style?:       string | StyleSpecification;
  className?:   string;
  /** Called once the map style has loaded */
  onMapReady?:  (map: import('maplibre-gl').Map) => void;
  /** Called on map click with [lng, lat] */
  onMapClick?:  (lngLat: [number, number]) => void;
  /** UI overlay children (rendered above the map canvas) */
  children?:    React.ReactNode;
  interactive?: boolean;
}

/** A named GeoJSON data source to be added to the map */
export interface MapGeoJSONSource {
  id:   string;
  data: GeoJSON.FeatureCollection | GeoJSON.Feature | string;
}

/** Descriptor for a toggleable map layer */
export interface MapLayerDescriptor {
  id:        string;
  label:     string;
  isVisible: boolean;
  group?:    string;
}
