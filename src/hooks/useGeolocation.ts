'use client';

/**
 * useGeolocation — Unified geolocation hook for Disastraaa
 *
 * Materially reduces duplication between:
 * 1. Main map "Locate me" control & auto-center on mount
 * 2. Route planner "Use my location" origin selector
 * 3. Citizen incident report form suggested location
 *
 * Design:
 * - One-time position lookup (no continuous background battery drain / tracking)
 * - Session-aware (avoids repeatedly prompting the user in a single session)
 * - Safe coordinate validation: bounds check [-180, 180] and [-90, 90]
 * - Graceful fallbacks for denied, unavailable, timeout, and unsupported browsers
 * - Safe unmount cleanup to avoid memory leaks
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LngLat } from '@/data/types';

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported';

export interface GeolocationState {
  status: GeolocationStatus;
  coordinates: LngLat | null;
  accuracy: number | null; // meters
  errorMessage: string | null;
  timestamp: number | null;
}

export interface UseGeolocationOptions {
  /** If true, triggers a single location request on mount if not previously handled in session */
  autoRequest?: boolean;
  /** Storage key to remember if user already had geolocation handled in current session */
  sessionKey?: string;
  /** Custom high accuracy flag (default true) */
  enableHighAccuracy?: boolean;
  /** Timeout in ms (default 10000) */
  timeout?: number;
  /** Maximum age in ms (default 0) */
  maximumAge?: number;
}

export function isValidCoordinates(coords: unknown): coords is LngLat {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const [lng, lat] = coords;
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    !isNaN(lng) &&
    !isNaN(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    autoRequest = false,
    sessionKey,
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    status: 'idle',
    coordinates: null,
    accuracy: null,
    errorMessage: null,
    timestamp: null,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const requestLocation = useCallback(
    (): Promise<LngLat | null> => {
      return new Promise((resolve) => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
          if (isMountedRef.current) {
            setState({
              status: 'unsupported',
              coordinates: null,
              accuracy: null,
              errorMessage: 'Geolocation is not supported by your browser.',
              timestamp: Date.now(),
            });
          }
          resolve(null);
          return;
        }

        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            status: 'requesting',
            errorMessage: null,
          }));
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const rawLat = pos.coords.latitude;
            const rawLng = pos.coords.longitude;
            const accuracy = Math.round(pos.coords.accuracy);

            const roundedLng = Math.round(rawLng * 100000) / 100000;
            const roundedLat = Math.round(rawLat * 100000) / 100000;
            const coords: LngLat = [roundedLng, roundedLat];

            if (!isValidCoordinates(coords)) {
              if (isMountedRef.current) {
                setState({
                  status: 'unavailable',
                  coordinates: null,
                  accuracy: null,
                  errorMessage: 'Device returned invalid coordinates.',
                  timestamp: Date.now(),
                });
              }
              resolve(null);
              return;
            }

            if (sessionKey && typeof sessionStorage !== 'undefined') {
              try {
                sessionStorage.setItem(sessionKey, 'granted');
              } catch {
                // Storage quota / restricted environment
              }
            }

            if (isMountedRef.current) {
              setState({
                status: 'granted',
                coordinates: coords,
                accuracy,
                errorMessage: null,
                timestamp: Date.now(),
              });
            }
            resolve(coords);
          },
          (err) => {
            let status: GeolocationStatus = 'unavailable';
            let message = 'Unable to determine your location.';

            switch (err.code) {
              case err.PERMISSION_DENIED:
                status = 'denied';
                message = 'Location permission denied. Map remains usable at standard default extent.';
                break;
              case err.POSITION_UNAVAILABLE:
                status = 'unavailable';
                message = 'Location signal unavailable. Please ensure GPS/network is enabled or pick location manually.';
                break;
              case err.TIMEOUT:
                status = 'timeout';
                message = 'Location request timed out. Please try again or select manually.';
                break;
            }

            if (sessionKey && typeof sessionStorage !== 'undefined') {
              try {
                sessionStorage.setItem(sessionKey, status);
              } catch {
                // Ignore
              }
            }

            if (isMountedRef.current) {
              setState({
                status,
                coordinates: null,
                accuracy: null,
                errorMessage: message,
                timestamp: Date.now(),
              });
            }
            resolve(null);
          },
          {
            enableHighAccuracy,
            timeout,
            maximumAge,
          },
        );
      });
    },
    [enableHighAccuracy, timeout, maximumAge, sessionKey],
  );

  // Auto-request on mount if enabled and not already handled in this session
  useEffect(() => {
    if (!autoRequest) return;

    if (sessionKey && typeof sessionStorage !== 'undefined') {
      try {
        const previousSessionStatus = sessionStorage.getItem(sessionKey);
        if (previousSessionStatus) {
          // Already handled in this session (granted, denied, or dismissed)
          return;
        }
      } catch {
        // Ignore storage exceptions
      }
    }

    requestLocation();
  }, [autoRequest, sessionKey, requestLocation]);

  return {
    ...state,
    requestLocation,
    isValidCoordinates,
  };
}
