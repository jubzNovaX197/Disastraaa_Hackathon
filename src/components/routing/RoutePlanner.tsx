'use client';

/**
 * RoutePlanner — Safe & Alternative Route Intelligence + Destination Safety
 *
 * Operational Decision Support System
 *
 * Combines:
 * - Shortest / Safest / Alternative route routing graph analysis
 * - Date/time-aware destination safety score & active warning intelligence
 * - Overall travel risk composite assessment
 *
 * Responsive: stacked on mobile, side-by-side on desktop.
 * Dark + light mode via Tailwind tokens.
 */

import { DataProvenance } from '@/components/demo/DataProvenance';
import { DestinationSafetyPanel } from '@/components/destination/DestinationSafetyPanel';
import { TimeScenarioPicker } from '@/components/destination/TimeScenarioPicker';
import { TravelRiskCard } from '@/components/destination/TravelRiskCard';
import { JourneyRiskPanel } from '@/components/journey';
import type { LngLat } from '@/data/types';
import { calculateDestinationSafety } from '@/lib/destination/engine';
import { demoScenarioProvider } from '@/lib/destination/scenarios';
import { calculateTravelRisk } from '@/lib/destination/travelEngine';
import type {
  DestinationSafetyResult,
  DestinationSafetyStatus,
  ScenarioSlotKey
} from '@/lib/destination/types';
import { calculateJourneyRisk, type JourneyRiskResult } from '@/lib/risk/journey';
import type { RoadSegment } from '@/lib/roads/types';
import { DEMO_NODES, buildGraphFromRoadSegments, calculateRoutes, type RoutingGraph } from '@/lib/routing';
import { DEMO_EDGES, NODE_BY_ID } from '@/lib/routing/graph';
import type { RouteNode, RouteResult } from '@/lib/routing/types';
import { cn } from '@/lib/utils';
import {
  ArrowUpDown,
  Compass,
  Globe,
  Loader2,
  Navigation,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { haversineDistanceKm } from '@/lib/geo/osm/validation';
import { useGeolocation, isValidCoordinates } from '@/hooks/useGeolocation';
import { RoutePreviewMap } from './RoutePreviewMap';

// ── Constants ────────────────────────────────────────────────────────────────

const NODE_ICON: Record<RouteNode['type'], string> = {
  SHELTER:  '⛺',
  HOSPITAL: '🏥',
  JUNCTION: '🔀',
  LANDMARK: '📍',
  EOC:      '📡',
};

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'text-safe',
  MODERATE: 'text-warning',
  HIGH:     'text-orange-400',
  CRITICAL: 'text-critical',
};

const SEVERITY_BG: Record<string, string> = {
  LOW:      'bg-safe/10 border-safe/20',
  MODERATE: 'bg-warning/10 border-warning/20',
  HIGH:     'bg-orange-400/10 border-orange-400/20',
  CRITICAL: 'bg-critical/10 border-critical/20',
};

const STATUS_COLOR: Record<string, string> = {
  OPEN:              'text-safe',
  CAUTION:           'text-warning',
  PARTIALLY_BLOCKED: 'text-orange-400',
  BLOCKED:           'text-critical',
  CLOSED:            'text-critical',
  UNKNOWN:           'text-slate-400',
};

const MODE_CONFIG = {
  SHORTEST: {
    label:    'Shortest Route',
    icon:     '⚡',
    accent:   'border-accent/30 bg-accent/5',
    tabColor: 'text-accent',
  },
  SAFEST: {
    label:    'Safest Route',
    icon:     '🛡️',
    accent:   'border-safe/30 bg-safe/5',
    tabColor: 'text-safe',
  },
  ALTERNATIVE: {
    label:    'Alternative Route',
    icon:     '🔄',
    accent:   'border-warning/30 bg-warning/5',
    tabColor: 'text-warning',
  },
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function RouteMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</span>
      {sub && <span className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</span>}
    </div>
  );
}

function RouteCard({
  result,
  destSafety,
  isSelected,
  onSelect,
}: {
  result: RouteResult;
  destSafety?: DestinationSafetyResult | null;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const cfg = MODE_CONFIG[result.mode];

  if (!result.found) {
    return (
      <div className={cn(
        'rounded-xl border p-4',
        'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-surface-elevated/40',
        'opacity-60',
      )}>
        <div className="flex items-center gap-2 mb-2">
          <span>{cfg.icon}</span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{cfg.label}</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          {result.notFoundReason ?? 'No route found.'}
        </p>
      </div>
    );
  }

  const hrs = Math.floor(result.totalMinutes / 60);
  const m   = result.totalMinutes % 60;
  const timeStr = hrs > 0 ? `${hrs}h ${m}m` : `${m} min`;

  // Calculate combined risk score for this route option
  const destRisk = destSafety ? 100 - destSafety.safetyScore : 0;
  let overallRisk = Math.round(0.55 * result.riskScore + 0.45 * destRisk);
  if (result.segments.some((s) => s.isBlocked)) {
    overallRisk = Math.max(overallRisk, 78);
  }

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all shadow-xs',
        isSelected
          ? cn('ring-2 ring-accent/60 shadow-sm border-accent', cfg.accent)
          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card hover:bg-slate-50 dark:hover:bg-surface-elevated',
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {destSafety && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-accent/30 bg-accent/10 text-accent font-bold">
              Overall: {overallRisk}/100
            </span>
          )}
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
            SEVERITY_BG[result.riskSeverity],
            SEVERITY_COLOR[result.riskSeverity],
          )}>
            Route: {result.riskSeverity}
          </span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <RouteMetric label="Distance" value={`${result.totalDistanceKm} km`} />
        <RouteMetric label="Estimated" value={timeStr} sub="weather-adj." />
        <RouteMetric label="Route Risk" value={`${result.riskScore}/100`} />
      </div>

      {/* Avoided / hazards */}
      {result.mode === 'SAFEST' && result.blockedAvoided > 0 && (
        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
          ✓ Avoids {result.blockedAvoided} blocked road{result.blockedAvoided > 1 ? 's' : ''}
        </div>
      )}
      {result.mode === 'SHORTEST' && result.segments.some((s) => s.isBlocked) && (
        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
          ⚠️ Passes through blocked road
        </div>
      )}
      {result.hazardsEncountered.length > 0 && result.mode !== 'SHORTEST' && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          {result.hazardsEncountered.length} road issue{result.hazardsEncountered.length > 1 ? 's' : ''} on route
        </div>
      )}
    </button>
  );
}

function RouteDetailPanel({ result }: { result: RouteResult }) {
  if (!result.found) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card p-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{result.notFoundReason}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card shadow-sm overflow-hidden">
      {/* Risk explanation */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-surface-elevated/40">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
          Route Corridor Analysis
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{result.riskExplanation}</p>
      </div>

      {/* Segments */}
      <div className="px-4 py-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Route Segments ({result.segments.length})
        </div>
        <div className="space-y-0">
          {result.segments.map((seg, i) => (
            <div
              key={seg.edgeId}
              className={cn(
                'py-2.5 flex items-start gap-3',
                i < result.segments.length - 1 && 'border-b border-slate-100 dark:border-white/[0.06]',
              )}
            >
              {/* Index bubble */}
              <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{seg.roadName}</span>
                  {seg.roadCode && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{seg.roadCode}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                  <span>{seg.distanceKm} km</span>
                  <span>{seg.travelMinutes} min</span>
                  <span className={STATUS_COLOR[seg.status]}>{seg.status.replace('_', ' ')}</span>
                  {seg.riskScore > 25 && (
                    <span className={SEVERITY_COLOR[seg.riskSeverity]}>
                      Risk {seg.riskScore}/100
                    </span>
                  )}
                </div>
                {seg.hazardNote && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">{seg.hazardNote}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assumptions footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/10 text-[10px] text-slate-500 dark:text-slate-400">
        ⚠️ Estimated transit duration calculated from road category, weather exposure, and reported hazards. Operational decision support; obey on-ground emergency directives.
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface RoutePlannerProps {
  autoCalculate?: boolean;
  /** Callback when a route is selected — passes map coordinates for display */
  onRouteSelected?: (coords: LngLat[], mode: RouteResult['mode']) => void;
  onRouteClear?: () => void;
  /** Callback when destination safety changes */
  onDestinationSafetyCalculated?: (safety: DestinationSafetyResult | null) => void;
  /** Callback when destination point is selected */
  onDestinationSelected?: (coords: LngLat, safetyScore: number, status: DestinationSafetyStatus) => void;
  /** Callback when journey risk is calculated */
  onJourneyRiskCalculated?: (journeyRisk: JourneyRiskResult | null) => void;
  /** Callback to highlight hazard corridor on map */
  onCorridorHighlighted?: (points: Array<{ coordinates: [number, number]; risk: string; name: string }>) => void;
  className?: string;
  initialDestinationId?: string;
  initialOriginId?: string;
  showFullDestinationPanel?: boolean;
  environment?: 'REAL' | 'DEMO';
}

import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';

export function RoutePlanner({
  onRouteSelected,
  onRouteClear,
  onDestinationSafetyCalculated,
  onDestinationSelected,
  onJourneyRiskCalculated,
  onCorridorHighlighted,
  className,
  initialDestinationId = '',
  initialOriginId = '',
  showFullDestinationPanel = true,
  environment: environmentProp,
  autoCalculate = false,
}: RoutePlannerProps) {
  const { environment: contextEnv, switchEnvironment, overrides } = useLiveIntelligence();
  const environment = environmentProp ?? contextEnv ?? 'REAL';
  const [originId, setOriginId] = useState<string>(initialOriginId);
  const [destinationId, setDestinationId] = useState<string>(initialDestinationId);
  const [originQuery, setOriginQuery] = useState<string>('');
  const [destQuery, setDestQuery] = useState<string>('');
  const [originCustomLabel, setOriginCustomLabel] = useState<string | null>(null);
  const [isLocatingOrigin, setIsLocatingOrigin] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [calculated, setCalculated] = useState(autoCalculate);
  const [activeMode, setActiveMode] = useState<RouteResult['mode']>('SAFEST');
  const [activeSlotKey, setActiveSlotKey] = useState<ScenarioSlotKey>('NOW');
  const [customDate, setCustomDate] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'JOURNEY' | 'ROUTES' | 'DESTINATION' | 'TRANSIT_RISK'>('JOURNEY');
  const [error, setError] = useState<string>('');

  const { requestLocation } = useGeolocation();

  // Real OSM Graph state
  const [realRoads, setRealRoads] = useState<RoadSegment[]>([]);
  const [realGraph, setRealGraph] = useState<RoutingGraph | null>(null);
  const [isLoadingReal, setIsLoadingReal] = useState<boolean>(false);
  const [realLoadError, setRealLoadError] = useState<string | null>(null);

  // Fetch real OSM roads AND shelters to build connected operational routing graph
  useEffect(() => {
    if (environment !== 'REAL') return;
    let isMounted = true;
    setIsLoadingReal(true);

    Promise.all([
      fetch('/api/roads?env=REAL').then((res) => res.json()),
      fetch('/api/shelters?env=REAL').then((res) => res.json()).catch(() => ({ shelters: [] })),
    ])
      .then(([roadsData, sheltersData]) => {
        if (!isMounted) return;
        const roads = roadsData.success && Array.isArray(roadsData.roads) ? roadsData.roads : [];
        const shelters = sheltersData.success && Array.isArray(sheltersData.shelters) ? sheltersData.shelters : [];
        if (roads.length > 0) {
          setRealRoads(roads);
          const g = buildGraphFromRoadSegments(roads, shelters);
          setRealGraph(g);
          setRealLoadError(null);
        } else {
          setRealLoadError(roadsData.error || 'No operational road segments returned.');
        }
      })
      .catch((err) => {
        if (isMounted) setRealLoadError(err.message || 'Failed to connect to road network API.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingReal(false);
      });

    return () => {
      isMounted = false;
    };
  }, [environment]);

  const handleTriggerIngest = useCallback(() => {
    setIsLoadingReal(true);
    setRealLoadError(null);
    fetch('/api/roads?env=REAL&ingest=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.roads) && data.roads.length > 0) {
          setRealRoads(data.roads);
          const g = buildGraphFromRoadSegments(data.roads);
          setRealGraph(g);
          setRealLoadError(null);
        } else {
          setRealLoadError(data.error || 'Ingestion returned 0 operational road segments.');
        }
      })
      .catch((err) => {
        setRealLoadError(err.message || 'Failed to execute Overpass ingestion.');
      })
      .finally(() => {
        setIsLoadingReal(false);
      });
  }, []);

  const effectiveGraph = useMemo(() => {
    if (environment === 'REAL') {
      return realGraph ?? undefined;
    }
    const roads = new Map(overrides.roads.map(road => [road.id, road]));
    return {
      nodes: DEMO_NODES, nodeById: NODE_BY_ID,
      edges: DEMO_EDGES.map(edge => {
        const road = edge.roadSegmentId ? roads.get(edge.roadSegmentId) : undefined;
        return road ? { ...edge, status: road.status, riskScore: road.travelRisk.score } : edge;
      }),
    };
  }, [environment, realGraph, overrides.roads]);

  // IDs belong to their graph; never carry demo IDs into live routing.
  useEffect(() => {
    setOriginId(environment === 'DEMO' ? initialOriginId : '');
    setDestinationId(environment === 'DEMO' ? initialDestinationId : '');
    setCalculated(environment === 'DEMO' && autoCalculate);
  }, [environment, initialOriginId, initialDestinationId, autoCalculate]);

  const nodeOptions = useMemo(() => {
    if (environment === 'REAL') {
      if (!realGraph || realGraph.nodes.length === 0) return [];
      return realGraph.nodes;
    }
    return DEMO_NODES.filter((n) => n.type !== 'JUNCTION');
  }, [environment, realGraph]);

  const originNode = useMemo(() => {
    if (!originId) return null;
    return effectiveGraph?.nodeById?.[originId] ?? nodeOptions.find((n) => n.id === originId) ?? null;
  }, [originId, effectiveGraph, nodeOptions]);

  const destNode = useMemo(() => {
    if (!destinationId) return null;
    return effectiveGraph?.nodeById?.[destinationId] ?? nodeOptions.find((n) => n.id === destinationId) ?? null;
  }, [destinationId, effectiveGraph, nodeOptions]);

  // 1. Calculate Destination Safety whenever destinationId or scenario changes
  const destinationSafety = useMemo(() => {
    if (!destinationId) return null;
    return calculateDestinationSafety({
      destinationId,
      coordinates: destNode?.coordinates,
      destinationName: destNode?.name,
      scenarioSlot: activeSlotKey,
      selectedDate: customDate || undefined,
      selectedTime: customTime || undefined,
      environment,
    });
  }, [environment, destinationId, activeSlotKey, customDate, customTime, destNode]);

  // 2. Calculate Routes when origin & destination are selected and calculated is true
  const results = useMemo(() => {
    if (!calculated || !originId || !destinationId) return null;
    if (environment === 'REAL' && !realGraph) return null;
    return calculateRoutes({ originNodeId: originId, destinationNodeId: destinationId }, effectiveGraph);
  }, [calculated, originId, destinationId, effectiveGraph, environment, realGraph]);

  const activeResult = results
    ? (results[activeMode.toLowerCase() as keyof typeof results] as RouteResult)
    : null;

  // 3. Calculate Combined Travel Risk (DEMO mode only)
  const travelRisk = useMemo(() => {
    if (environment === 'REAL' || !destinationSafety) return null;
    return calculateTravelRisk({
      routeResult: activeResult,
      destinationSafety,
      comparisonRoutes: results,
    });
  }, [environment, activeResult, destinationSafety, results]);

  // 4. Calculate Comprehensive Journey Risk (DEMO mode only)
  const journeyRisk = useMemo(() => {
    if (environment === 'REAL' || !destinationSafety || !originId || !destinationId) return null;
    return calculateJourneyRisk({
      originNodeId: originId,
      destinationNodeId: destinationId,
      scenarioSlot: activeSlotKey,
      selectedDate: customDate || undefined,
      selectedTime: customTime || undefined,
      selectedRoute: activeResult,
      destinationSafety,
      environment,
    });
  }, [environment, originId, destinationId, activeSlotKey, customDate, customTime, activeResult, destinationSafety]);

  // Determine effective tab so that if user selected a destination without calculating routes,
  // it shows Destination Safety immediately without leaving an empty/broken tab body!
  const effectiveTab = useMemo(() => {
    if (activeTab === 'JOURNEY' && !calculated && destinationSafety) {
      return 'DESTINATION';
    }
    if (activeTab === 'ROUTES' && !results && destinationSafety) {
      return 'DESTINATION';
    }
    if (activeTab === 'TRANSIT_RISK' && !travelRisk?.hasRoute && destinationSafety) {
      return 'DESTINATION';
    }
    return activeTab;
  }, [activeTab, calculated, results, destinationSafety, travelRisk]);



  const handleUseMyLocationForOrigin = useCallback(async () => {
    setLocationNotice(null);
    setIsLocatingOrigin(true);
    try {
      const coords = await requestLocation();
      if (!coords || !isValidCoordinates(coords)) {
        setLocationNotice('Device location unavailable or permission denied.');
        return;
      }

      if (nodeOptions.length === 0) {
        setLocationNotice('No road nodes currently loaded in network.');
        return;
      }

      let closest: RouteNode | null = null;
      let minDistance = Infinity;

      for (const n of nodeOptions) {
        const d = haversineDistanceKm(coords[1], coords[0], n.coordinates[1], n.coordinates[0]);
        if (d < minDistance) {
          minDistance = d;
          closest = n;
        }
      }

      if (closest) {
        setOriginId(closest.id);
        setOriginCustomLabel(`Current Location (snapped to ${closest.name})`);
        setOriginQuery('');
        setCalculated(false);
        if (minDistance > 50) {
          setLocationNotice(`Current device position is ~${Math.round(minDistance)}km from the closest monitored road corridor (${closest.name}).`);
        } else {
          setLocationNotice(`Device location snapped to nearest road corridor: ${closest.name} (±${minDistance.toFixed(1)}km).`);
        }
      }
    } catch {
      setLocationNotice('Unable to acquire device location.');
    } finally {
      setIsLocatingOrigin(false);
    }
  }, [requestLocation, nodeOptions]);

  const handleSwapEndpoints = useCallback(() => {
    if (!originId && !destinationId) return;
    const prevOriginId = originId;
    setOriginId(destinationId);
    setOriginCustomLabel(destNode?.name ?? null);
    setDestinationId(prevOriginId);
    setOriginQuery('');
    setDestQuery('');
    setCalculated(false);
    setError('');
  }, [originId, destinationId, destNode]);

  const handleCalculate = useCallback(() => {
    setError('');
    if (!originId) {
      setError('Please select an origin starting location.');
      return;
    }
    if (!destinationId) {
      setError('Please select a destination.');
      return;
    }
    if (originId === destinationId) {
      setError('Origin and destination cannot be the same location.');
      return;
    }
    const oNode = effectiveGraph?.nodeById?.[originId] ?? nodeOptions.find((n) => n.id === originId);
    const dNode = effectiveGraph?.nodeById?.[destinationId] ?? nodeOptions.find((n) => n.id === destinationId);
    if (!oNode || !dNode || !isValidCoordinates(oNode.coordinates) || !isValidCoordinates(dNode.coordinates)) {
      setError('Invalid coordinates for selected endpoints.');
      return;
    }
    setCalculated(true);
    setActiveMode('SAFEST');
    setActiveTab(environment === 'REAL' ? 'ROUTES' : 'JOURNEY');
  }, [originId, destinationId, effectiveGraph, nodeOptions, environment]);

  const handleClear = useCallback(() => {
    setCalculated(false);
    setOriginId('');
    setDestinationId('');
    setOriginQuery('');
    setDestQuery('');
    setOriginCustomLabel(null);
    setLocationNotice(null);
    setError('');
    setActiveTab('JOURNEY');
    onRouteClear?.();
    onDestinationSafetyCalculated?.(null);
    onJourneyRiskCalculated?.(null);
    onCorridorHighlighted?.([]);
  }, [onRouteClear, onDestinationSafetyCalculated, onJourneyRiskCalculated, onCorridorHighlighted]);

  // Notify parent of destination safety updates
  useEffect(() => {
    if (environment === 'REAL') {
      onDestinationSafetyCalculated?.(null);
      return;
    }
    onDestinationSafetyCalculated?.(destinationSafety);
    if (destinationSafety) {
      onDestinationSelected?.(
        destinationSafety.coordinates,
        destinationSafety.safetyScore,
        destinationSafety.status
      );
    }
  }, [environment, destinationSafety, onDestinationSafetyCalculated, onDestinationSelected]);

  // Notify parent of Journey Risk and corridor highlights
  useEffect(() => {
    if (environment === 'REAL') {
      onJourneyRiskCalculated?.(null);
      onCorridorHighlighted?.([]);
      return;
    }
    onJourneyRiskCalculated?.(journeyRisk);
    if (journeyRisk && journeyRisk.hazardCorridor.length > 0) {
      const pts = journeyRisk.hazardCorridor
        .filter((c) => !!c.coordinates)
        .map((c) => ({
          coordinates: c.coordinates!,
          risk: c.risk,
          name: c.segmentName,
        }));
      onCorridorHighlighted?.(pts);
    } else {
      onCorridorHighlighted?.([]);
    }
  }, [environment, journeyRisk, onJourneyRiskCalculated, onCorridorHighlighted]);

  // Emit map coordinates when active route changes
  useEffect(() => {
    if (activeResult?.found) {
      onRouteSelected?.(activeResult.mapCoordinates, activeResult.mode);
    } else if (!activeResult && !destinationSafety) {
      onRouteClear?.();
    }
  }, [activeResult, destinationSafety, onRouteSelected, onRouteClear]);



  // If in REAL mode but no real OSM network has loaded yet, display professional standby state
  if (environment === 'REAL' && (!realGraph || realGraph.nodes.length === 0)) {
    return (
      <div className="p-8 sm:p-12 text-center rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 mx-auto flex items-center justify-center">
          {isLoadingReal ? <Loader2 className="w-7 h-7 animate-spin" /> : <Compass className="w-7 h-7" />}
        </div>
        <div className="space-y-1.5 max-w-lg mx-auto">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
            <span>Live Road Intelligence &amp; Transit Routing Graph Standing By</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {isLoadingReal
              ? 'Ingesting real OpenStreetMap / Overpass geospatial corridor telemetry for live origin-destination routing...'
              : 'Real-time road network telemetry connects to live OpenStreetMap Overpass and PostGIS geospatial tables.'}
          </p>
          {realLoadError && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 mt-2">
              ⚠️ {realLoadError}
            </p>
          )}
        </div>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={isLoadingReal}
            onClick={handleTriggerIngest}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 border border-cyan-500/35 text-cyan-300 hover:bg-cyan-500/30 transition-colors shadow-sm disabled:opacity-50"
          >
            {isLoadingReal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{isLoadingReal ? 'Connecting to Overpass...' : 'Connect & Ingest Live OSM Roads'}</span>
          </button>
          <button
            type="button"
            onClick={() => switchEnvironment('DEMO')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-colors shadow-sm"
          >
            <span>Explore Demo Simulation</span>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <DataProvenance model detail="Routes, transit risk and destination safety are advisory calculations" />
      {/* Operations disclaimer */}
      <div
        className={cn(
          'px-3.5 py-2.5 rounded-xl border text-xs flex items-start gap-2.5 backdrop-blur-md',
          environment === 'REAL'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-200'
            : 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-200'
        )}
      >
        {environment === 'REAL' ? (
          <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
        ) : (
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="space-y-0.5">
          <div className="font-bold flex items-center gap-2">
            <span>
              {environment === 'REAL'
                ? 'Real OpenStreetMap Road Intelligence & Transit Corridor'
                : 'Safe Transit & Corridor Risk Intelligence'}
            </span>
            <span
              className={cn(
                'text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider',
                environment === 'REAL'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
              )}
            >
              {environment === 'REAL' ? 'REAL OSM INGESTION ACTIVE' : 'Decision Support'}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {environment === 'REAL'
              ? `Connected to ${realRoads.length} real public OpenStreetMap road segments. Live origin-to-destination graph routing active.`
              : 'Multi-hazard scenario model for emergency transit decision-support. Not live GPS traffic or official evacuation mandates.'}
          </p>
        </div>
      </div>

      {/* Date & Time Scenario Selector */}
      <TimeScenarioPicker
        activeScenario={
          destinationSafety?.scenario ??
          demoScenarioProvider.getScenario(customDate, customTime)
        }
        onSelectScenarioSlot={(slotKey) => {
          setActiveSlotKey(slotKey);
          setCustomDate('');
          setCustomTime('');
        }}
        onCustomDateTimeChange={(d, t) => {
          setCustomDate(d);
          setCustomTime(t);
        }}
      />

      {/* Origin + Destination search & selection */}
      <div className="grid grid-cols-1 gap-3">
        {/* Origin Field */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-surface-elevated/40 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Starting Origin Location
            </label>
            {/* Convenient "Use My Location" action */}
            <button
              type="button"
              onClick={handleUseMyLocationForOrigin}
              disabled={isLocatingOrigin}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-accent text-slate-950 hover:bg-accent/90 shadow-xs transition-all active:scale-98 disabled:opacity-60"
              title="Detect current device location and snap to nearest road node"
            >
              {isLocatingOrigin ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span>{isLocatingOrigin ? 'Acquiring GPS...' : 'Use My Location'}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {nodeOptions.length > 8 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={originQuery}
                  onChange={(e) => setOriginQuery(e.target.value)}
                  placeholder="Filter origin place, junction, or shelter…"
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white dark:bg-surface-base border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            )}
            <select
              value={originId}
              onChange={(e) => {
                setOriginId(e.target.value);
                setOriginCustomLabel(null);
                setCalculated(false);
              }}
              className={cn(
                'w-full rounded-xl border text-xs px-3 py-2',
                'bg-white dark:bg-surface-elevated border-slate-300 dark:border-white/15',
                'text-slate-900 dark:text-slate-100 font-medium',
                'focus:outline-none focus:ring-2 focus:ring-accent/50'
              )}
            >
              <option value="" className="bg-white dark:bg-surface-elevated text-slate-900 dark:text-slate-100">
                Select origin from {nodeOptions.length} points…
              </option>
              {nodeOptions
                .filter((n) => !originQuery || n.id === originId || n.name.toLowerCase().includes(originQuery.toLowerCase()) || n.type.toLowerCase().includes(originQuery.toLowerCase()))
                .map((n) => (
                  <option key={n.id} value={n.id} disabled={n.id === destinationId} className="bg-white dark:bg-surface-elevated text-slate-900 dark:text-slate-100">
                    {NODE_ICON[n.type]} {n.name} ({n.type})
                  </option>
                ))}
            </select>
            {originNode && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono px-1">
                <span className="truncate">{originCustomLabel || originNode.name}</span>
                <span className="flex-shrink-0">{originNode.coordinates[1].toFixed(4)}°N, {originNode.coordinates[0].toFixed(4)}°E</span>
              </div>
            )}
          </div>

          {locationNotice && (
            <div className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded p-1.5 flex items-center gap-1.5 animate-fade-in">
              <span>📍</span>
              <span>{locationNotice}</span>
            </div>
          )}
        </div>

        {/* Swap Control */}
        <div className="flex justify-center -my-1.5 relative z-10 pointer-events-auto">
          <button
            type="button"
            onClick={handleSwapEndpoints}
            disabled={!originId && !destinationId}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-surface-elevated hover:bg-slate-100 dark:hover:bg-surface-overlay text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/15 shadow-xs transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Swap Starting Origin and Destination"
            aria-label="Swap starting origin and destination"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-accent" />
            <span>Swap Locations</span>
          </button>
        </div>

        {/* Destination Field */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-surface-elevated/40 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Destination Location
            </label>
            {destNode && (
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Destination Chosen
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {nodeOptions.length > 8 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={destQuery}
                  onChange={(e) => setDestQuery(e.target.value)}
                  placeholder="Filter destination shelter, hospital, or locality…"
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white dark:bg-surface-base border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            )}
            <select
              value={destinationId}
              onChange={(e) => {
                setDestinationId(e.target.value);
                setCalculated(false);
                if (e.target.value) {
                  setActiveTab('DESTINATION');
                }
              }}
              className={cn(
                'w-full rounded-xl border text-xs px-3 py-2',
                'bg-white dark:bg-surface-elevated border-slate-300 dark:border-white/15',
                'text-slate-900 dark:text-slate-100 font-medium',
                'focus:outline-none focus:ring-2 focus:ring-accent/50'
              )}
            >
              <option value="" className="bg-white dark:bg-surface-elevated text-slate-900 dark:text-slate-100">
                Select destination from {nodeOptions.length} points…
              </option>
              {nodeOptions
                .filter((n) => !destQuery || n.id === destinationId || n.name.toLowerCase().includes(destQuery.toLowerCase()) || n.type.toLowerCase().includes(destQuery.toLowerCase()))
                .map((n) => (
                  <option key={n.id} value={n.id} disabled={n.id === originId} className="bg-white dark:bg-surface-elevated text-slate-900 dark:text-slate-100">
                    {NODE_ICON[n.type]} {n.name} ({n.type})
                  </option>
                ))}
            </select>
            {destNode && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono px-1">
                <span className="truncate">{destNode.name}</span>
                <span className="flex-shrink-0">{destNode.coordinates[1].toFixed(4)}°N, {destNode.coordinates[0].toFixed(4)}°E</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-[11px] text-critical bg-critical/10 border border-critical/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Action buttons: Find Safe Route & Reset */}
      <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleCalculate}
          disabled={!originId || !destinationId}
          className={cn(
            'flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2',
            'bg-accent text-slate-950 hover:bg-accent/90 active:scale-98',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent'
          )}
        >
          <Compass className="w-4 h-4 text-slate-950" />
          <span>Find Safe Route</span>
        </button>

        {(calculated || originId || destinationId) && (
          <button
            type="button"
            onClick={handleClear}
            className="py-3 px-5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            Reset Route
          </button>
        )}
      </div>

      {/* Quick Destination Safety preview banner if destination is selected but route not yet calculated */}
      {destinationSafety && !calculated && (
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-elevated shadow-sm flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex flex-col items-center justify-center text-accent flex-shrink-0">
              <span className="text-sm font-black leading-none">{destinationSafety.safetyScore}</span>
              <span className="text-[8px] font-bold">/100</span>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Destination Baseline Safety
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {destinationSafety.destinationName} · {destinationSafety.status}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('DESTINATION')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors',
              effectiveTab === 'DESTINATION'
                ? 'bg-accent text-slate-950 shadow-sm'
                : 'bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200'
            )}
          >
            View Intelligence
          </button>
        </div>
      )}

      {/* Tab navigation if route and/or destination are active */}
      {(calculated || destinationSafety) && (
        <div className="flex border-b border-slate-200 dark:border-white/15 gap-2 pt-2 overflow-x-auto scrollbar-none">
          {calculated && journeyRisk && (
            <button
              onClick={() => setActiveTab('JOURNEY')}
              className={cn(
                'pb-2.5 px-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0',
                effectiveTab === 'JOURNEY'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <span>🎯</span>
              <span>Journey Risk</span>
            </button>
          )}

          {calculated && (
            <button
              onClick={() => setActiveTab('ROUTES')}
              className={cn(
                'pb-2.5 px-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0',
                effectiveTab === 'ROUTES'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <span>🛣️</span>
              <span>Safe Routes</span>
            </button>
          )}

          {destinationSafety && (
            <button
              onClick={() => setActiveTab('DESTINATION')}
              className={cn(
                'pb-2.5 px-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0',
                effectiveTab === 'DESTINATION'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Destination Safety</span>
            </button>
          )}

          {travelRisk?.hasRoute && (
            <button
              onClick={() => setActiveTab('TRANSIT_RISK')}
              className={cn(
                'pb-2.5 px-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0',
                effectiveTab === 'TRANSIT_RISK'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Overall Travel Risk</span>
            </button>
          )}
        </div>
      )}

      {/* Tab 0: Comprehensive Journey Risk Intelligence */}
      {effectiveTab === 'JOURNEY' && journeyRisk && (
        <JourneyRiskPanel
          journeyRisk={journeyRisk}
          activeMode={activeMode}
          onSelectMode={(mode) => setActiveMode(mode)}
          onSelectTimeSlot={(slotKey) => {
            setActiveSlotKey(slotKey as ScenarioSlotKey);
            setCustomDate('');
            setCustomTime('');
          }}
        />
      )}

      {/* Tab 1: Route Options & Segments */}
      {effectiveTab === 'ROUTES' && results && (
        <div className="space-y-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Route Options (Safest / Shortest / Alternative)
          </div>

          {/* Interactive Map Visualization of the Selected Route */}
          {activeResult?.found && activeResult.mapCoordinates.length > 1 && (
            <RoutePreviewMap
              coordinates={activeResult.mapCoordinates}
              mode={activeResult.mode}
              originName={originCustomLabel || originNode?.name}
              destinationName={destNode?.name}
            />
          )}

          {/* No-route-found honest alert */}
          {!activeResult?.found && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-1.5 text-left">
              <div className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Route Unavailable on Current Network</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                {environment === 'REAL'
                  ? `No connected road path exists between ${originCustomLabel || originNode?.name || 'origin'} and ${destNode?.name || 'destination'} within the ${realRoads.length} operational OpenStreetMap road corridors. The points may be geographically disconnected or obstructed by road closures.`
                  : (activeResult?.notFoundReason || 'No viable route found.')}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {(['SAFEST', 'SHORTEST', 'ALTERNATIVE'] as const).map((mode) => {
              const r = results[mode.toLowerCase() as keyof typeof results] as RouteResult;
              return (
                <RouteCard
                  key={mode}
                  result={r}
                  destSafety={destinationSafety}
                  isSelected={activeMode === mode}
                  onSelect={() => {
                    setActiveMode(mode);
                  }}
                />
              );
            })}
          </div>

          {/* Active Route Segment Breakdown */}
          {activeResult?.found && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {MODE_CONFIG[activeMode].label} — Segment Detail
              </div>
              <RouteDetailPanel result={activeResult} />
            </div>
          )}

          {/* Real-Mode Disaster Safety & Road Data Limitations Disclosure */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-bold">Corridor Data Freshness &amp; Safety Disclaimer: </span>
            {environment === 'REAL'
              ? 'Route calculated from genuine OpenStreetMap road network and real-time hazard status. Safest mode penalizes reported road closures, flooding, and severe weather risks according to current telemetry. Unmonitored rural stretches or unverified local roads may have unreported hazards; obey official police barriers and emergency directives.'
              : 'Advisory transit path model based on simulated scenario conditions.'}
          </div>
        </div>
      )}

      {/* Tab 2: Overall Travel Risk Analysis */}
      {effectiveTab === 'TRANSIT_RISK' && travelRisk && (
        <TravelRiskCard
          travelRisk={travelRisk}
          activeMode={activeMode}
          onSelectMode={(mode) => setActiveMode(mode)}
        />
      )}

      {/* Tab 3: Detailed Destination Safety Panel */}
      {effectiveTab === 'DESTINATION' && destinationSafety && showFullDestinationPanel && (
        <DestinationSafetyPanel
          safetyResult={destinationSafety}
          onSelectScenarioSlot={(slotKey) => {
            setActiveSlotKey(slotKey);
            setCustomDate('');
            setCustomTime('');
          }}
          onCustomDateTimeChange={(d, t) => {
            setCustomDate(d);
            setCustomTime(t);
          }}
        />
      )}
    </div>
  );
}
