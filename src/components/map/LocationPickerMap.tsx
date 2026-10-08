'use client';

/**
 * LocationPickerMap
 *
 * Interactive map pin & live browser geolocation picker for incident reporting.
 *
 * Features:
 * 1. Live browser Geolocation API ("Use My Current Location") with high accuracy
 * 2. Proper error states: Permission Denied, Position Unavailable, Timeout, Unsupported
 * 3. Clearly labeled simulated demo hotspot fallback
 * 4. Interactive map pin placement (click map or drag pin)
 * 5. Visual confirmed coordinate readout (Latitude / Longitude in DD)
 * 6. Responsive layout with touch support for mobile & desktop
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MLMap, Marker as MLMarker } from 'maplibre-gl';
import {
  MapPin,
  Navigation,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mapConfig, getMapStyleForTheme } from '@/config/map';
import { useTheme } from '@/context/ThemeContext';
import type { LngLat } from '@/data/types';

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
  onCoordinatesChange: (coords: LngLat, suggestedAddress?: string, suggestedAdmin?: string) => void;
  className?: string;
}

export function LocationPickerMap({
  coordinates,
  onCoordinatesChange,
  className,
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<MLMarker | null>(null);
  const { theme } = useTheme();

  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSuccess, setGeoSuccess] = useState<string | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);

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
        <div style="position:relative;cursor:grab;display:flex;flex-direction:column;items:center;transform:translate(-50%,-100%);">
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
        setGeoSuccess('Pin position adjusted');
        onCoordinatesChange(newCoords);
      });

      map.on('click', (e) => {
        const newCoords: LngLat = [
          Math.round(e.lngLat.lng * 100000) / 100000,
          Math.round(e.lngLat.lat * 100000) / 100000,
        ];
        marker.setLngLat(newCoords);
        setGeoSuccess('Pin placed at selected location');
        onCoordinatesChange(newCoords);
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

  // ── Browser Geolocation API ("Use My Current Location") ─────────────────────
  const handleGetCurrentLocation = useCallback(() => {
    setGeoError(null);
    setGeoSuccess(null);
    setAccuracyMeters(null);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. Please place the pin manually on the map.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        const newCoords: LngLat = [
          Math.round(longitude * 100000) / 100000,
          Math.round(latitude * 100000) / 100000,
        ];

        setAccuracyMeters(Math.round(accuracy));
        setGeoSuccess(`Live GPS location acquired (Accuracy: ±${Math.round(accuracy)}m)`);

        if (mapRef.current && markerRef.current) {
          markerRef.current.setLngLat(newCoords);
          mapRef.current.flyTo({
            center: newCoords,
            zoom: 14,
            speed: 1.2,
          });
        }

        const suggestedLabel = `GPS Observation (${newCoords[1].toFixed(4)}°N, ${newCoords[0].toFixed(4)}°E)`;
        onCoordinatesChange(newCoords, suggestedLabel, 'Live Field Observation');
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError(
              'Location permission denied by browser. Please enable location access or click on the map to pin your location.',
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError(
              'Location unavailable (GPS offline or signal weak). Please adjust the pin manually on the map.',
            );
            break;
          case error.TIMEOUT:
            setGeoError(
              'Location request timed out. Please try again or click anywhere on the map to place your pin.',
            );
            break;
          default:
            setGeoError('Unable to retrieve location. Please click on the map to set your location pin.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [onCoordinatesChange]);

  const handleSelectPreset = (preset: (typeof DEMO_HOTSPOT_PRESETS)[0]) => {
    setShowPresets(false);
    setGeoError(null);
    setGeoSuccess(`Selected demo hotspot: ${preset.name}`);
    setAccuracyMeters(null);

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLngLat(preset.coords);
      mapRef.current.flyTo({ center: preset.coords, zoom: 13, speed: 1.2 });
    }

    onCoordinatesChange(preset.coords, preset.name, preset.admin);
  };

  const formattedLat = `${Math.abs(coordinates[1]).toFixed(5)}° ${coordinates[1] >= 0 ? 'N' : 'S'}`;
  const formattedLng = `${Math.abs(coordinates[0]).toFixed(5)}° ${coordinates[0] >= 0 ? 'E' : 'W'}`;

  return (
    <div className={cn('space-y-2 font-sans', className)}>
      {/* ── Control Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Use My Current Location Button */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all',
              'bg-accent text-slate-950 hover:bg-accent/90 active:scale-98 disabled:opacity-60',
            )}
            title="Detect live GPS coordinates using device geolocation"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>{isLocating ? 'Acquiring GPS...' : 'Use My Current Location'}</span>
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
        <div className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300">
          <Crosshair className="w-3 h-3 text-accent" />
          <span>{formattedLat}, {formattedLng}</span>
        </div>
      </div>

      {/* Geolocation Feedback alerts */}
      {geoError && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Location Warning: </span>
            <span>{geoError}</span>
          </div>
        </div>
      )}

      {geoSuccess && (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{geoSuccess}</span>
        </div>
      )}

      {/* ── Interactive Map Container ── */}
      <div className="relative w-full h-52 sm:h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner">
        <div ref={containerRef} className="w-full h-full" />

        {/* Map interaction overlay instruction banner */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <div className="px-2.5 py-1 rounded-md bg-black/70 text-white text-[10px] backdrop-blur-sm shadow flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-red-400" />
            <span>Click map or drag pin to adjust location</span>
          </div>
        </div>

        {/* Accuracy indicator if available */}
        {accuracyMeters !== null && (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono backdrop-blur-xs">
              GPS Accuracy: ±{accuracyMeters}m
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
