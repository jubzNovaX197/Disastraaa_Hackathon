'use client';

/**
 * RoutePreviewMap
 *
 * Interactive MapLibre GIS preview rendering the calculated road route geometry,
 * start/destination markers, and auto-fitting bounds.
 */

import { getMapStyleForTheme } from '@/config/map';
import { useTheme } from '@/context/ThemeContext';
import type { LngLat } from '@/data/types';
import type { RouteMode } from '@/lib/routing/types';
import { cn } from '@/lib/utils';
import type { Map as MLMap, Marker as MLMarker } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

const MODE_COLORS: Record<RouteMode, string> = {
  SAFEST: '#10B981',      // Emerald
  SHORTEST: '#F59E0B',    // Amber
  ALTERNATIVE: '#8B5CF6', // Purple
};

interface RoutePreviewMapProps {
  coordinates: LngLat[];
  mode?: RouteMode;
  originName?: string;
  destinationName?: string;
  className?: string;
}

export function RoutePreviewMap({
  coordinates,
  mode = 'SAFEST',
  originName = 'Origin',
  destinationName = 'Destination',
  className,
}: RoutePreviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<MLMarker[]>([]);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current || coordinates.length < 2) return;

    let canceled = false;

    const init = async () => {
      const { Map, Marker, NavigationControl } = await import('maplibre-gl');
      if (canceled || !containerRef.current) return;

      const styleUrl = getMapStyleForTheme(theme);
      const origin = coordinates[0];
      const dest = coordinates[coordinates.length - 1];

      const lngs = coordinates.map((c) => c[0]);
      const lats = coordinates.map((c) => c[1]);
      const minLng = Math.min(...lngs);
      const minLat = Math.min(...lats);
      const maxLng = Math.max(...lngs);
      const maxLat = Math.max(...lats);

      const map = new Map({
        container: containerRef.current,
        style: styleUrl,
        center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
        zoom: 11,
        attributionControl: false,
      });

      map.addControl(new NavigationControl({ showCompass: true }), 'bottom-right');

      map.on('load', () => {
        if (canceled) return;
        map.resize();

        // 1. Add Route GeoJSON Source & Layers
        const routeColor = MODE_COLORS[mode] ?? '#10B981';

        map.addSource('route-preview-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates,
            },
            properties: { mode },
          },
        });

        // Casing/halo line
        map.addLayer({
          id: 'route-preview-casing',
          type: 'line',
          source: 'route-preview-source',
          paint: {
            'line-color': '#0F172A',
            'line-width': 7,
            'line-opacity': 0.7,
          },
        });

        // Main colored line
        map.addLayer({
          id: 'route-preview-line',
          type: 'line',
          source: 'route-preview-source',
          paint: {
            'line-color': routeColor,
            'line-width': 4.5,
            'line-opacity': 0.95,
          },
        });

        // 2. Add Start & Destination Markers
        const originEl = document.createElement('div');
        originEl.innerHTML = `
          <div style="background:#10B981;color:#FFFFFF;border:2.5px solid #FFFFFF;box-shadow:0 0 10px rgba(16,185,129,0.8);border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;">
            A
          </div>
        `;
        const originMarker = new Marker({ element: originEl })
          .setLngLat(origin)
          .addTo(map);

        const destEl = document.createElement('div');
        destEl.innerHTML = `
          <div style="background:#EF4444;color:#FFFFFF;border:2.5px solid #FFFFFF;box-shadow:0 0 10px rgba(239,68,68,0.8);border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;">
            B
          </div>
        `;
        const destMarker = new Marker({ element: destEl })
          .setLngLat(dest)
          .addTo(map);

        markersRef.current = [originMarker, destMarker];

        // 3. Fit Bounds to Route
        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 45, maxZoom: 14, duration: 400 },
        );
      });

      mapRef.current = map;
    };

    init();

    return () => {
      canceled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [coordinates, mode, theme]);

  return (
    <div className={cn('relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner', className)}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 pointer-events-none z-10 flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded bg-black/75 text-white text-[10px] font-medium backdrop-blur-xs shadow">
          A: {originName} → B: {destinationName}
        </span>
      </div>
    </div>
  );
}
