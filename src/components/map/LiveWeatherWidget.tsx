'use client';

/**
 * LiveWeatherWidget — real meteorological telemetry widget for the situation map.
 *
 * Consumes normalized weather telemetry from /api/weather.
 * Displays:
 * - Temperature (°C) & Apparent temperature
 * - Atmospheric condition & icon
 * - Precipitation & rainfall (mm)
 * - Wind speed & direction
 * - Relative humidity & barometric pressure
 * - Source & Data freshness indicator (LIVE / RECENT / STALE / UNAVAILABLE)
 * - Coordinates & observation timestamp
 * - Graceful empty/unavailable state
 */

import type { AppEnvironment } from '@/lib/env';
import { cn } from '@/lib/utils';
import type { NormalizedWeather, WeatherFreshnessStatus } from '@/lib/weather/types';
import {
  ChevronDown,
  CloudRain,
  Droplets,
  Gauge,
  Info,
  RefreshCw,
  Wind
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface LiveWeatherWidgetProps {
  environment?: AppEnvironment;
  coordinates?: [number, number]; // [lng, lat]
  locationName?: string;
  className?: string;
}

export function LiveWeatherWidget({
  environment = 'REAL',
  coordinates,
  locationName,
  className,
}: LiveWeatherWidgetProps) {
  const [weather, setWeather] = useState<NormalizedWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('env', environment);
      if (coordinates) {
        params.set('lon', coordinates[0].toString());
        params.set('lat', coordinates[1].toString());
      }
      if (locationName) {
        params.set('location', locationName);
      }

      const res = await fetch(`/api/weather?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.weather) {
        setWeather(data.weather);
      } else {
        setWeather(null);
        setError(data.error || 'Telemetry unavailable');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to weather telemetry provider');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, [environment, coordinates, locationName]);

  useEffect(() => {
    fetchWeather();
    // Auto-refresh weather every 5 minutes
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  const freshnessBadge = (status: WeatherFreshnessStatus) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
            LIVE
          </span>
        );
      case 'RECENT':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            RECENT
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            STALE
          </span>
        );
      case 'UNAVAILABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            UNAVAILABLE
          </span>
        );
    }
  };

  return (
    <div className={cn('pointer-events-auto select-none', className)}>
      <span className="block text-[9px] text-slate-500 dark:text-slate-300">{environment === 'DEMO' ? 'Simulated' : 'Live API · Open-Meteo'}</span>
      {/* Minimized Pill */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-label="Toggle live weather telemetry"
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg backdrop-blur-md transition-all active:scale-98 border',
          expanded
            ? 'bg-slate-200 dark:bg-surface-elevated text-slate-900 dark:text-slate-100 border-slate-300 dark:border-white/20'
            : 'bg-white/95 dark:bg-surface-elevated/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-overlay border-slate-200 dark:border-white/10',
        )}
      >
        <span className="text-sm leading-none">{weather?.icon ?? '🌤️'}</span>
        <div className="flex items-center gap-1.5">
          {weather ? (
            <>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {Math.round(weather.temperatureC)}°C
              </span>
              <span className="hidden sm:inline text-slate-500 dark:text-slate-400">·</span>
              <span className="hidden sm:inline truncate max-w-[110px] text-[11px] text-slate-600 dark:text-slate-300">
                {weather.condition}
              </span>
            </>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              {loading ? 'Checking feed...' : 'Weather'}
            </span>
          )}
        </div>
        {weather && freshnessBadge(weather.freshnessStatus)}
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {/* Expanded Telemetry Flyout */}
      {expanded && (
        <div
          className={cn(
            'absolute top-full right-0 mt-1.5 w-72 sm:w-80 z-30',
            'rounded-xl shadow-2xl p-3.5',
            'bg-white/98 dark:bg-surface-card/95 backdrop-blur-xl',
            'border border-slate-200 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5',
            'animate-slide-up',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200/80 dark:border-white/[0.08]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                {weather?.locationName ?? locationName ?? 'Sector Telemetry'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {weather
                  ? `${weather.coordinates[1].toFixed(2)}°N, ${weather.coordinates[0].toFixed(2)}°E`
                  : 'Atmospheric Sensor Grid'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {weather && freshnessBadge(weather.freshnessStatus)}
              <button
                type="button"
                onClick={fetchWeather}
                disabled={loading}
                title="Refresh telemetry"
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Body */}
          {loading && !weather ? (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
              <RefreshCw className="w-5 h-5 text-accent animate-spin" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Ingesting meteorological telemetry...
              </span>
            </div>
          ) : error && !weather ? (
            <div className="py-4 text-center">
              <div className="inline-flex p-2 rounded-full bg-amber-500/10 text-amber-500 mb-1.5">
                <Info className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Data Stream Unavailable
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{error}</p>
              <button
                onClick={fetchWeather}
                className="mt-2 text-xs font-medium text-accent hover:underline"
              >
                Retry Stream
              </button>
            </div>
          ) : weather ? (
            <div className="space-y-3">
              {/* Primary Condition Display */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none">{weather.icon}</span>
                  <div>
                    <div className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                      {weather.temperatureC.toFixed(1)}°C
                    </div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {weather.condition}
                    </div>
                  </div>
                </div>
                {weather.apparentTemperatureC !== undefined && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Feels like</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {weather.apparentTemperatureC.toFixed(1)}°C
                    </span>
                  </div>
                )}
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 gap-2">
                {/* Wind */}
                <div className="p-2 rounded-lg bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.04] flex items-center gap-2">
                  <Wind className="w-4 h-4 text-accent flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block truncate">Wind Speed</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {weather.windSpeedKmh.toFixed(1)} km/h
                    </span>
                  </div>
                </div>

                {/* Precipitation */}
                <div className="p-2 rounded-lg bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.04] flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block truncate">Precipitation</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {weather.precipitationMm.toFixed(1)} mm
                    </span>
                  </div>
                </div>

                {/* Relative Humidity */}
                <div className="p-2 rounded-lg bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.04] flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block truncate">Humidity</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {weather.relativeHumidityPct}%
                    </span>
                  </div>
                </div>

                {/* Surface Pressure */}
                <div className="p-2 rounded-lg bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.04] flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block truncate">Pressure</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {Math.round(weather.surfacePressureHpa)} hPa
                    </span>
                  </div>
                </div>
              </div>

              {/* Hourly Forecast Strip (if available) */}
              {weather.hourlyForecast && weather.hourlyForecast.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                    Forecast Trend
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                    {weather.hourlyForecast.slice(0, 6).map((pt, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center flex-shrink-0 p-1.5 rounded-md bg-slate-100/60 dark:bg-white/[0.03] text-center min-w-[46px]"
                      >
                        <span className="text-[9px] text-slate-400 font-mono">
                          {pt.time.includes('T') ? pt.time.split('T')[1].slice(0, 5) : pt.time}
                        </span>
                        <span className="text-xs my-0.5">
                          {pt.condition.includes('Rain') ? '🌧️' : pt.condition.includes('Cloud') ? '⛅' : '🌤️'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                          {Math.round(pt.temperatureC)}°
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provenance Metadata */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06] flex flex-col gap-0.5 text-[9px] text-slate-400 dark:text-slate-500">
                <div className="flex justify-between items-center">
                  <span>Source: {weather.source}</span>
                  <span>Observed: {new Date(weather.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div>Retrieved: {new Date(weather.retrievedAt).toLocaleTimeString()}</div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
