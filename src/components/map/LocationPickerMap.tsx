'use client';

/**
 * LocationPickerMap
 *
 * Interactive map pin & live browser geolocation picker for incident reporting.
 *
 * Features:
 * 1. Automatic location suggestion via useGeolocation hook on mount
 * 2. Clear distinction between detected device position and confirmed disaster location
 * 3. Manual map pin placement via clicking or dragging
 * 4. Manual coordinate inputs for field operators (Latitude / Longitude in DD)
 * 5. Visual confirmed coordinate readout and accuracy metrics
 * 6. Responsive layout with touch support for mobile & desktop
 */

import { getMapStyleForTheme } from '@/config/map';
import { useTheme } from '@/context/ThemeContext';
import type { LngLat } from '@/data/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Compass,
  Crosshair,
  Edit3,
  Loader2,
  MapPin,
  Navigation,
} from 'lucide-react';
import type { Map as MLMap, Marker as MLMarker } from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState } from 'react';

export type IncidentLocationSource =
  | 'AUTO_DEVICE'
  | 'MANUAL_MAP_PIN'
  | 'MANUAL_COORDS'
  | 'HOTSPOT_PRESET'
  | 'DEFAULT';

export const DEMO_HOTSPOT_PRESETS: {
  name: string;
  admin: string;
  coords: LngLat;
}[] = [
  { name: 'Grand Road, Puri Town', admin: 'Puri District, Odisha', coords: [85.832, 19.81] },
  { name: 'Cuttack North, Mahanadi River Bank', admin: 'Cuttack District, Odisha', coords: [85.89, 20.46] },
  { name: 'Kendrapara Coastal Lowland', admin: 'Kendrapara District, Odisha', coords: [86.43, 20.49] },
  { name: 'Bhubaneswar NH-16 Corridor', admin: 'Khordha District, Odisha', coords: [85.824, 20.296] },
  { name: 'Balasore Coastal Belt', admin: 'Balasore District, Odisha', coords: [86.93, 21.49] },
  { name: 'Rushikulya Basin, Ganjam', admin: 'Ganjam District, Odisha', coords: [85.04, 19.38] },
  { name: 'Visakhapatnam Lowland Zone', admin: 'Visakhapatnam District, AP', coords: [83.31, 17.71] },
];

interface LocationPickerMapProps {
  coordinates: LngLat;
  onCoordinatesChange: (
    coords: LngLat,
    suggestedAddress?: string,
    suggestedAdmin?: string,
    source?: IncidentLocationSource,
  ) => void;
  className?: string;
  autoRequestLocation?: boolean;
}

export function LocationPickerMap({
  coordinates,
  onCoordinatesChange,
  className,
  autoRequestLocation = true,
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<MLMarker | null>(null);
  const { theme } = useTheme();

  const [locationSource, setLocationSource] = useState<IncidentLocationSource>('DEFAULT');
  const [geoNotice, setGeoNotice] = useState<string | null>(null);
  const [geoSuccess, setGeoSuccess] = useState<string | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showManualInputs, setShowManualInputs] = useState(false);
  const [manualLat, setManualLat] = useState(coordinates[1].toString());
  const [manualLng, setManualLng] = useState(coordinates[0].toString());

  // Shared Geolocation Hook
  const {
    status: geoStatus,
    coordinates: detectedCoords,
    accuracy: detectedAccuracy,
    errorMessage: geoError,
    requestLocation,
  } = useGeolocation({
    autoRequest: autoRequestLocation,
    sessionKey: 'disastraaa_incident_report_session',
  });

  // Handle auto-detection arrival
  useEffect(() => {
    if (detectedCoords && locationSource === 'DEFAULT') {
      setLocationSource('AUTO_DEVICE');
      setAccuracyMeters(detectedAccuracy);
      setGeoSuccess(`Device location suggested (±${detectedAccuracy ?? 15}m). Adjust pin if disaster occurred elsewhere.`);
      setManualLat(detectedCoords[1].toString());
      setManualLng(detectedCoords[0].toString());

      if (mapRef.current && markerRef.current) {
        markerRef.current.setLngLat(detectedCoords);
        mapRef.current.flyTo({ center: detectedCoords, zoom: 14, speed: 1.2 });
      }

      onCoordinatesChange(
        detectedCoords,
        `Device Location (${detectedCoords[1].toFixed(4)}°N, ${detectedCoords[0].toFixed(4)}°E)`,
        'Live Observation',
        'AUTO_DEVICE',
      );
    }
  }, [detectedCoords, detectedAccuracy, locationSource, onCoordinatesChange]);

  // Sync manual input fields when coordinates change externally
  useEffect(() => {
    setManualLat(coordinates[1].toFixed(5));
    setManualLng(coordinates[0].toFixed(5));
  }, [coordinates]);

  // Initialize MapLibre & Marker
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let canceled = false;

    const initMap = async () => {
      const { Map, Marker, NavigationControl } = await import('maplibre-gl');
      if (canceled || !containerRef.current) return;

      const styleUrl = getMapStyleForTheme(theme);

      const map = new Map({
        container: containerRef.current,
        style: styleUrl,
        center: coordinates,
        zoom: 12,
        attributionControl: false,
      });

      map.addControl(new NavigationControl({ showCompass: true }), 'bottom-right');

      // Create Custom Pin Element
      const el = document.createElement('div');
      el.className = 'disaster-incident-pin';
      el.innerHTML = `
        <div style="position:relative;cursor:grab;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
          <div style="width:36px;height:36px;border-radius:50%;background:#EF4444;border:3px solid #FFFFFF;box-shadow:0 10px 25px rgba(239,68,68,0.5);display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-size:16px;">
            📍
          </div>
          <div style="width:6px;height:6px;border-radius:50%;background:#EF4444;margin:2px auto 0;box-shadow:0 0 6px rgba(239,68,68,0.8);"></div>
        </div>
      `;

      const marker = new Marker({ element: el, draggable: true })
        .setLngLat(coordinates)
        .addTo(map);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        const newCoords: LngLat = [
          Math.round(lngLat.lng * 100000) / 100000,
          Math.round(lngLat.lat * 100000) / 100000,
        ];
        setLocationSource('MANUAL_MAP_PIN');
        setGeoSuccess('Incident marker manually positioned on map.');
        onCoordinatesChange(
          newCoords,
          `Custom Pin Location (${newCoords[1].toFixed(4)}°N, ${newCoords[0].toFixed(4)}°E)`,
          undefined,
          'MANUAL_MAP_PIN',
        );
      });

      map.on('click', (e) => {
        const newCoords: LngLat = [
          Math.round(e.lngLat.lng * 100000) / 100000,
          Math.round(e.lngLat.lat * 100000) / 100000,
        ];
        marker.setLngLat(newCoords);
        setLocationSource('MANUAL_MAP_PIN');
        setGeoSuccess('Incident marker placed at selected location.');
        onCoordinatesChange(
          newCoords,
          `Custom Pin Location (${newCoords[1].toFixed(4)}°N, ${newCoords[0].toFixed(4)}°E)`,
          undefined,
          'MANUAL_MAP_PIN',
        );
      });

      map.on('load', () => {
        map.resize();
      });

      mapRef.current = map;
      markerRef.current = marker;
    };

    initMap();

    return () => {
      canceled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker position when coordinates prop changes externally
  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return;
    const current = markerRef.current.getLngLat();
    if (
      Math.abs(current.lng - coordinates[0]) > 0.0001 ||
      Math.abs(current.lat - coordinates[1]) > 0.0001
    ) {
      markerRef.current.setLngLat(coordinates);
      mapRef.current.flyTo({ center: coordinates, zoom: Math.max(mapRef.current.getZoom(), 12) });
    }
  }, [coordinates]);

  // Manual Trigger: "Use My Current Location"
  const handleGetCurrentLocation = useCallback(async () => {
    setGeoNotice(null);
    setGeoSuccess(null);
    setAccuracyMeters(null);

    const coords = await requestLocation();
    if (coords) {
      setLocationSource('AUTO_DEVICE');
      setAccuracyMeters(detectedAccuracy ?? 12);
      setGeoSuccess(`Device location detected (±${detectedAccuracy ?? 12}m). Adjust marker if incident is elsewhere.`);

      if (mapRef.current && markerRef.current) {
        markerRef.current.setLngLat(coords);
        mapRef.current.flyTo({ center: coords, zoom: 14, speed: 1.2 });
      }

      onCoordinatesChange(
        coords,
        `Device Location (${coords[1].toFixed(4)}°N, ${coords[0].toFixed(4)}°E)`,
        'Live Observation',
        'AUTO_DEVICE',
      );
    } else {
      setGeoNotice(geoError || 'Location permission denied. Tap or drag the pin anywhere on the map to place the incident.');
    }
  }, [requestLocation, detectedAccuracy, geoError, onCoordinatesChange]);

  const handleSelectPreset = (preset: (typeof DEMO_HOTSPOT_PRESETS)[0]) => {
    setShowPresets(false);
    setGeoNotice(null);
    setLocationSource('HOTSPOT_PRESET');
    setGeoSuccess(`Selected demo hotspot: ${preset.name}`);
    setAccuracyMeters(null);

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLngLat(preset.coords);
      mapRef.current.flyTo({ center: preset.coords, zoom: 13, speed: 1.2 });
    }

    onCoordinatesChange(preset.coords, preset.name, preset.admin, 'HOTSPOT_PRESET');
  };

  const handleApplyManualCoords = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setGeoNotice('Please enter valid numeric latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }

    const newCoords: LngLat = [
      Math.round(lng * 100000) / 100000,
      Math.round(lat * 100000) / 100000,
    ];
    setLocationSource('MANUAL_COORDS');
    setGeoNotice(null);
    setGeoSuccess(`Manual coordinates set: ${newCoords[1]}°N, ${newCoords[0]}°E`);

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLngLat(newCoords);
      mapRef.current.flyTo({ center: newCoords, zoom: 14, speed: 1.2 });
    }

    onCoordinatesChange(
      newCoords,
      `Manual Coordinates (${newCoords[1].toFixed(4)}°N, ${newCoords[0].toFixed(4)}°E)`,
      'Custom Coordinates',
      'MANUAL_COORDS',
    );
  };

  const formattedLat = `${Math.abs(coordinates[1]).toFixed(5)}° ${coordinates[1] >= 0 ? 'N' : 'S'}`;
  const formattedLng = `${Math.abs(coordinates[0]).toFixed(5)}° ${coordinates[0] >= 0 ? 'E' : 'W'}`;

  return (
    <div className={cn('space-y-2.5 font-sans', className)}>
      {/* ── Control Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Detect / Use My Location Button */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={geoStatus === 'requesting'}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all',
              'bg-accent text-slate-950 hover:bg-accent/90 active:scale-98 disabled:opacity-60',
            )}
            title="Detect live GPS coordinates from reporter device"
          >
            {geoStatus === 'requesting' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>{geoStatus === 'requesting' ? 'Locating...' : 'Suggest My Location'}</span>
          </button>

          {/* Toggle Manual Lat/Lng fields */}
          <button
            type="button"
            onClick={() => setShowManualInputs((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors"
            title="Manually type decimal degree coordinates"
          >
            <Edit3 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>{showManualInputs ? 'Hide Coords' : 'Type Coords'}</span>
          </button>

          {/* Quick Demo Hotspot Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresets((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              <span>Demo Hotspots</span>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {showPresets && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-surface-elevated rounded-xl shadow-xl border border-slate-200 dark:border-white/10 z-30 p-1 space-y-0.5 max-h-56 overflow-y-auto animate-fade-in">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Simulated Disaster Hotspot
                </div>
                {DEMO_HOTSPOT_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-accent/15 hover:text-slate-900 dark:hover:text-slate-100 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.admin}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pin Location Status Readout */}
        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300">
          <Crosshair className="w-3.5 h-3.5 text-accent" />
          <span>{formattedLat}, {formattedLng}</span>
        </div>
      </div>

      {/* Manual coordinate entry drawer if expanded */}
      {showManualInputs && (
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500">Lat:</label>
            <input
              type="text"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-surface-base font-mono text-xs focus:ring-1 focus:ring-accent"
              placeholder="19.81"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500">Lng:</label>
            <input
              type="text"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-white/15 bg-white dark:bg-surface-base font-mono text-xs focus:ring-1 focus:ring-accent"
              placeholder="85.83"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyManualCoords}
            className="px-3 py-1 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </div>
      )}

      {/* Geolocation feedback alerts */}
      {geoNotice && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Notice: </span>
            <span>{geoNotice}</span>
          </div>
        </div>
      )}

      {geoSuccess && (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{geoSuccess}</span>
          </div>
          {locationSource === 'AUTO_DEVICE' && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300">
              Suggested Device Position
            </span>
          )}
        </div>
      )}

      {/* Distinction notice between Device GPS & Disaster Location */}
      {locationSource === 'AUTO_DEVICE' && (
        <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/25 text-[11px] text-blue-800 dark:text-blue-200 flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Reporter Position Suggested:</strong> Your device GPS coordinates were detected. If the disaster or road blockage is at a different location nearby, drag the pin or click on the map to set the actual incident location.
          </div>
        </div>
      )}

      {/* ── Interactive Map Container ── */}
      <div className="relative w-full h-52 sm:h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner">
        <div ref={containerRef} className="w-full h-full" />

        {/* Map interaction overlay instruction banner */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <div className="px-2.5 py-1 rounded-md bg-black/75 text-white text-[10px] backdrop-blur-sm shadow flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-red-400" />
            <span>Click map or drag pin to adjust incident location</span>
          </div>
        </div>

        {/* Accuracy indicator if available */}
        {accuracyMeters !== null && (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded bg-slate-900/85 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono backdrop-blur-xs">
              GPS Accuracy: ±{accuracyMeters}m
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
