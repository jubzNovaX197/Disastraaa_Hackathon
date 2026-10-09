'use client';

/**
 * MapContainer — reusable MapLibre GL JS wrapper.
 *
 * Design principles:
 *  - MapLibre is dynamically imported inside useEffect so it never
 *    runs in the SSR environment.
 *  - The CSS is imported statically at the top of this file; Next.js
 *    extracts it into the global stylesheet at build time.
 *  - All disaster-specific layer logic lives OUTSIDE this component.
 *    This component only handles: init, controls, cleanup, and a slot
 *    for UI overlay children.
 *  - Sources, layers, and GeoJSON are added by parent components via
 *    the onMapReady callback.
 */

import 'maplibre-gl/dist/maplibre-gl.css';

import { mapConfig } from '@/config/map';
import { cn } from '@/lib/utils';
import type { Map as MLMap, StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import type { MapContainerProps } from './types';

export function MapContainer({
  viewState,
  style,
  className,
  onMapReady,
  onMapClick,
  children,
  interactive = true,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<MLMap | null>(null);
  const readyCallbackRef = useRef(onMapReady);
  useEffect(() => { readyCallbackRef.current = onMapReady; }, [onMapReady]);
  const targetStyleRef = useRef(style ?? mapConfig.defaultStyle);
  const currentAppliedStyleRef = useRef<string | StyleSpecification | null>(null);

  useEffect(() => {
    targetStyleRef.current = style ?? mapConfig.defaultStyle;
  }, [style]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let canceled = false;

    const init = async () => {
      const {
        Map,
        NavigationControl,
        ScaleControl,
        AttributionControl,
      } = await import('maplibre-gl');

      if (canceled || !containerRef.current) return;

      const initialStyle = targetStyleRef.current ?? mapConfig.defaultStyle;

      const map = new Map({
        container:        containerRef.current,
        style:            initialStyle,
        center:           viewState?.center  ?? mapConfig.defaultCenter,
        zoom:             viewState?.zoom    ?? mapConfig.defaultZoom,
        bearing:          viewState?.bearing ?? 0,
        pitch:            viewState?.pitch   ?? 0,
        minZoom:          mapConfig.minZoom,
        maxZoom:          mapConfig.maxZoom,
        attributionControl: false,
        interactive,
      });

      // Controls
      if (mapConfig.controls.attribution) {
        map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
      }
      if (mapConfig.controls.navigation && interactive) {
        map.addControl(new NavigationControl({ showCompass: true }), 'bottom-right');
      }
      if (mapConfig.controls.scale) {
        map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');
      }

      // Click handler
      if (onMapClick) {
        map.on('click', (e) => {
          onMapClick([e.lngLat.lng, e.lngLat.lat]);
        });
      }

      // Notify parent when style is fully loaded
      map.on('load', () => {
        if (!canceled) {
          map.resize();
          readyCallbackRef.current?.(map);
        }
      });

      if (canceled) {
        map.remove();
      } else {
        mapRef.current = map;
        currentAppliedStyleRef.current = initialStyle;

        // In case style updated while async init was importing maplibre
        if (targetStyleRef.current !== initialStyle) {
          map.setStyle(targetStyleRef.current);
          currentAppliedStyleRef.current = targetStyleRef.current;
        }
      }
    };

    init().catch(console.error);

    return () => {
      canceled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      currentAppliedStyleRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle dynamic style switching (e.g. Light <-> Dark <-> Satellite <-> Streets)
  useEffect(() => {
    const map = mapRef.current;
    const targetStyle = style ?? mapConfig.defaultStyle;
    targetStyleRef.current = targetStyle;

    if (!map) return;
    if (currentAppliedStyleRef.current === targetStyle) return;

    currentAppliedStyleRef.current = targetStyle;

    let executed = false;
    const handleStyleReady = () => {
      if (executed) return;
      executed = true;
      map.resize();
      readyCallbackRef.current?.(map);
    };

    const onStyleData = () => {
      if (map.isStyleLoaded()) {
        map.off('styledata', onStyleData);
        handleStyleReady();
      }
    };

    // Attach listeners BEFORE setStyle to capture both async and sync style load events
    map.once('style.load', handleStyleReady);
    map.on('styledata', onStyleData);

    map.setStyle(targetStyle);

    // If style loaded synchronously (common for inline StyleSpecification objects)
    if (map.isStyleLoaded()) {
      handleStyleReady();
    }

    return () => {
      map.off('style.load', handleStyleReady);
      map.off('styledata', onStyleData);
    };
  }, [style]);

  return (
    <div className={cn('relative w-full h-full overflow-hidden bg-[#0b0f19]', className)}>
      {/* MapLibre renders into this div — dark background prevents white flash during tile loading / zooming */}
      <div ref={containerRef} className="w-full h-full bg-[#0b0f19]" />

      {/* UI overlay slot — individual children control pointer-events */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {children}
      </div>
    </div>
  );
}
