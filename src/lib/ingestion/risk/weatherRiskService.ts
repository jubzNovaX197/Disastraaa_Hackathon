/**
 * Weather-to-Risk Intelligence Service (Part 1 Implementation)
 *
 * Connects live weather telemetry (Open-Meteo) to:
 * - Flood Risk Engine (calculateFloodRisk, explainFloodRisk)
 * - Cyclone Risk Engine (calculateCycloneRisk, explainCycloneRisk)
 * - Multi-Hazard Risk Engine (calculateMultiHazardRisk, explainMultiHazardRisk)
 *
 * Data Pipeline Flow:
 * weather_telemetry -> latest observations -> risk input normalization
 * -> calculateFloodRisk() -> calculateCycloneRisk() -> calculateMultiHazardRisk()
 * -> derived RiskZone & FloodArea GIS entities -> RealHazardProvider -> map/dashboard
 *
 * Implements Part 7 Caching: Caches derived RiskZones with a TTL to avoid
 * re-computing models on every single HTTP page load.
 */

import type { NormalizedWeather } from '@/lib/weather/types';
import type { RiskZone, FloodArea, PolygonRing, LngLat } from '@/data/types';
import { calculateFloodRisk, explainFloodRisk } from '@/lib/risk/flood';
import { calculateCycloneRisk, explainCycloneRisk } from '@/lib/risk/cyclone';
import { calculateMultiHazardRisk, explainMultiHazardRisk } from '@/lib/risk/multiHazard';
import { executeQuery } from '@/lib/db';
import { getCachedWeather, getAllCachedWeather } from '@/lib/weather/store';
import { riverService } from '@/lib/hydrology/riverService';

// Cache for derived risk zones (15-minute TTL)
interface CachedRiskResults {
  riskZones: RiskZone[];
  floodAreas: FloodArea[];
  cycloneZones: RiskZone[];
  expiresAt: number;
}

let _derivedRiskCache: CachedRiskResults | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Creates a circular polygon buffer around a coordinate point.
 * [lng, lat] with radiusKm.
 */
export function createCircularPolygon(center: LngLat, radiusKm: number, numPoints = 12): PolygonRing[] {
  const [lng, lat] = center;
  const ring: LngLat[] = [];

  // Approximate conversions for India latitudes (1 degree lat ~= 111 km, 1 degree lon ~= 104 km)
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i < numPoints; i++) {
    const angle = (i * 2 * Math.PI) / numPoints;
    const pLng = Number((lng + lngDelta * Math.cos(angle)).toFixed(4));
    const pLat = Number((lat + latDelta * Math.sin(angle)).toFixed(4));
    ring.push([pLng, pLat]);
  }
  // Close the ring
  ring.push(ring[0]);

  return [ring];
}

export class WeatherRiskService {
  /**
   * Fetches the latest operational weather observations across monitored regions.
   */
  async getLatestWeatherObservations(): Promise<NormalizedWeather[]> {
    // 1. Check database if connected
    if (process.env.DATABASE_URL) {
      try {
        const rows = await executeQuery<any>(
          `SELECT
            id, location_name, state, district,
            ST_X(coordinates) as lon, ST_Y(coordinates) as lat,
            temperature_c, relative_humidity_pct, precipitation_mm,
            wind_speed_kmh, wind_direction_deg, surface_pressure_hpa,
            weather_code, weather_condition, source,
            observed_at, retrieved_at, freshness_status, forecast_json
          FROM weather_telemetry
          WHERE environment = 'REAL'
          ORDER BY observed_at DESC
          LIMIT 25;`,
        );

        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            locationName: r.location_name,
            state: r.state,
            district: r.district,
            coordinates: [parseFloat(r.lon), parseFloat(r.lat)],
            temperatureC: parseFloat(r.temperature_c),
            apparentTemperatureC: parseFloat(r.temperature_c),
            relativeHumidityPct: parseInt(r.relative_humidity_pct, 10),
            precipitationMm: parseFloat(r.precipitation_mm),
            windSpeedKmh: parseFloat(r.wind_speed_kmh),
            windDirectionDeg: r.wind_direction_deg ? parseInt(r.wind_direction_deg, 10) : 0,
            surfacePressureHpa: r.surface_pressure_hpa ? parseFloat(r.surface_pressure_hpa) : 1010,
            weatherCode: parseInt(r.weather_code, 10),
            condition: r.weather_condition,
            icon: '🌧️',
            isDay: true,
            source: r.source,
            observedAt: r.observed_at,
            retrievedAt: r.retrieved_at,
            validFrom: r.observed_at,
            validUntil: new Date(new Date(r.observed_at).getTime() + 60 * 60 * 1000).toISOString(),
            freshnessStatus: r.freshness_status,
            environment: 'REAL',
            hourlyForecast: typeof r.forecast_json === 'string' ? JSON.parse(r.forecast_json) : (r.forecast_json ?? []),
          }));
        }
      } catch (err: any) {
        console.warn('[WEATHER-RISK] Database query fallback:', err.message);
      }
    }

    // 2. Check in-memory cache for recent weather
    const cachedList = getAllCachedWeather();
    return cachedList;
  }

  /**
   * Computes derived RiskZones and FloodAreas from weather observations.
   */
  async computeDerivedRisks(forceRefresh = false): Promise<CachedRiskResults> {
    if (!forceRefresh && _derivedRiskCache && Date.now() < _derivedRiskCache.expiresAt) {
      return _derivedRiskCache;
    }

    const observations = await this.getLatestWeatherObservations();
    if (observations.length === 0) {
      const emptyResult: CachedRiskResults = {
        riskZones: [],
        floodAreas: [],
        cycloneZones: [],
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      _derivedRiskCache = emptyResult;
      return emptyResult;
    }

    const riskZones: RiskZone[] = [];
    const floodAreas: FloodArea[] = [];
    const cycloneZones: RiskZone[] = [];

    for (const wx of observations) {
      const [lon, lat] = wx.coordinates;

      // ── 1. Flood Risk Normalization ───────────────────────────
      // Use 24h accumulation if hourly forecast available; otherwise extrapolate instantaneous rate
      let precip24h = Math.max(0, wx.precipitationMm * 24);
      if (Array.isArray(wx.hourlyForecast) && wx.hourlyForecast.length >= 24) {
        const sum24 = wx.hourlyForecast.slice(0, 24).reduce((acc, h) => acc + (h.precipitationMm || 0), 0);
        if (sum24 > 0) {
          precip24h = Math.round(sum24 * 10) / 10;
        }
      }

      // Hydrology: Query riverService without fabricating water level from rainfall
      let riverLevelMetres = 0; // Default: 0 m above flood stage (normal flow)
      try {
        const hydro = await riverService.getRiverStatusForDistrict(
          wx.state || 'Odisha',
          wx.district || 'Kalahandi',
          lat,
          lon,
        );
        if (hydro.gauges.length > 0) {
          const primary = hydro.gauges[0];
          if (primary.dangerLevelMslMeters && primary.waterLevelMslMeters) {
            // Relative to danger level (negative = below flood stage)
            riverLevelMetres = Math.round((primary.waterLevelMslMeters - primary.dangerLevelMslMeters) * 100) / 100;
          }
        }
      } catch {
        // Fallback to neutral 0 m when hydrology feed is offline
        riverLevelMetres = 0;
      }

      const floodResult = calculateFloodRisk(
        {
          rainfallIntensityMmPerDay: precip24h,
          riverLevelMetres,
          elevationMetres: 18,
          distanceFromRiverKm: 3.0,
          exposedPopulation: 35000,
          historicalFloodFrequency: 1.5,
          infrastructureVulnerabilityIndex: 0.35,
        },
        true, // isLive
      );
      const floodExp = explainFloodRisk(floodResult);

      // ── 2. Cyclone Risk Normalization ─────────────────────────
      const windKmh = wx.windSpeedKmh;
      // Storm surge only applies to coastal districts; inland districts (like Kalahandi) are 0 m
      const isCoastal = ['puri', 'jagatsinghpur', 'kendrapara', 'ganjam', 'bhadrak', 'balasore'].some(
        (c) =>
          (wx.district && wx.district.toLowerCase().includes(c)) ||
          (wx.locationName && wx.locationName.toLowerCase().includes(c)),
      );
      const pressureDropSurge = isCoastal ? Math.max(0, (1013 - wx.surfacePressureHpa) * 0.04) : 0;

      const cycloneResult = calculateCycloneRisk(
        {
          windSpeedKmh: windKmh,
          rainfallMmPerDay: precip24h,
          stormSurgeMetres: pressureDropSurge,
          distanceFromTrackKm: 45,
          exposedPopulation: 45000,
          elevationMetres: 18,
          historicalCycloneFrequency: 1.2,
          infrastructureVulnerabilityIndex: 0.35,
        },
        true, // isLive
      );
      const cycloneExp = explainCycloneRisk(cycloneResult);

      // ── 3. Multi-Hazard Composite Risk ────────────────────────
      const maxPop = Math.max(floodResult.affectedPopulation, cycloneResult.affectedPopulation);
      const multiResult = calculateMultiHazardRisk({
        flood: floodExp,
        cyclone: cycloneExp,
        affectedPopulation: maxPop,
      });
      const multiExp = explainMultiHazardRisk(multiResult);

      // Create GIS polygon footprint (12 km radius)
      const buffer = createCircularPolygon([lon, lat], 12);

      // If composite risk score is elevated (> 20), publish a RiskZone
      if (multiResult.score >= 20) {
        const zone: RiskZone = {
          id: `rz-wx-${wx.id}`,
          name: `${wx.locationName} Weather Risk Basin`,
          severity: multiResult.severity,
          coordinates: buffer,
          primaryHazard: multiResult.dominantHazard,
          riskScore: multiResult.score,
          affectedPopulation: multiResult.affectedPopulation,
          description: `${multiExp.overallSummary} Telemetry: Wind ${Math.round(wx.windSpeedKmh)} km/h, Rain ${wx.precipitationMm} mm/h.`,
        };
        riskZones.push(zone);

        if (multiResult.dominantHazard === 'CYCLONE' && cycloneResult.score >= 35) {
          cycloneZones.push(zone);
        }
      }

      // If flood risk is elevated (> 30), publish FloodArea
      if (floodResult.score >= 30) {
        floodAreas.push({
          id: `fa-wx-${wx.id}`,
          name: `${wx.locationName} Inundation Zone`,
          severity: floodResult.severity,
          type: 'FLOOD',
          coordinates: buffer,
          depthMeters: Math.round(floodResult.score * 0.02 * 10) / 10,
          areaKm2: 18,
          lastUpdated: wx.observedAt,
          description: `Localized flood risk derived from live Open-Meteo telemetry (${wx.precipitationMm} mm/h precipitation).`,
        });
      }
    }

    const cached: CachedRiskResults = {
      riskZones,
      floodAreas,
      cycloneZones,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    _derivedRiskCache = cached;

    return cached;
  }

  _resetForTesting(): void {
    _derivedRiskCache = null;
  }
}

export const weatherRiskService = new WeatherRiskService();
