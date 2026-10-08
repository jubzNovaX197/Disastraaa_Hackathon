'use client';

/**
 * Travel Safety & Road Intelligence Page (Task 12)
 *
 * Provides real-time road conditions, disaster hazard exposure,
 * citizen blockage reports, and authority road verifications.
 *
 * ⚠️ PROTOYPE DECISION SUPPORT — NOT AN OFFICIAL EMERGENCY BROADCAST
 */

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  ExternalLink,
  Info,
  Map as MapIcon,
  Navigation,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { demoRoadSegments } from '@/data/demo';
import { demoCitizenReports } from '@/data/demo/citizenReports';
import {
  RoadCard,
  RoadDetailPanel,
  RoadFilters,
} from '@/components/roads';
import {
  filterRoads,
  type RoadSegment,
} from '@/lib/roads';
import type { CitizenReportItem } from '@/lib/reports/types';
import { Footer } from '@/components/layout/Footer';
import { RoutePlanner } from '@/components/routing/RoutePlanner';

import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';

export default function TravelPage() {
  const { environment, overrides, switchEnvironment } = useLiveIntelligence();
  const [localRoads, setLocalRoads] = useState<RoadSegment[] | null>(null);
  const roads = localRoads ?? overrides.roads;
  const [selectedRoadId, setSelectedRoadId] = useState<string>(roads[0]?.id ?? '');
  const [currentFilter, setCurrentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeReportModal, setActiveReportModal] = useState<CitizenReportItem | null>(null);

  // Sync real operational roads from OSM API when in REAL mode
  useEffect(() => {
    if (environment === 'REAL') {
      fetch('/api/roads?env=REAL')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.roads) && data.roads.length > 0) {
            setLocalRoads(data.roads);
          }
        })
        .catch(() => {});
    } else {
      setLocalRoads(null);
    }
  }, [environment]);

  // Sync selected road if roads change
  useEffect(() => {
    if (roads.length > 0 && (!selectedRoadId || !roads.some((r) => r.id === selectedRoadId))) {
      setSelectedRoadId(roads[0].id);
    }
  }, [roads, selectedRoadId]);

  // Compute counts for filter tabs
  const counts = useMemo(() => {
    return {
      ALL: roads.length,
      OPEN: roads.filter((r) => r.status === 'OPEN').length,
      CAUTION: roads.filter((r) => r.status === 'CAUTION').length,
      PARTIALLY_BLOCKED: roads.filter((r) => r.status === 'PARTIALLY_BLOCKED').length,
      BLOCKED: roads.filter((r) => r.status === 'BLOCKED').length,
      CLOSED: roads.filter((r) => r.status === 'CLOSED').length,
      HIGH_RISK: roads.filter((r) => r.travelRisk.severity === 'HIGH' || r.travelRisk.severity === 'CRITICAL').length,
    };
  }, [roads]);

  // Filtered roads based on active filter and search query
  const filteredRoads = useMemo(() => {
    return filterRoads(roads, currentFilter, searchQuery);
  }, [roads, currentFilter, searchQuery]);

  // Currently selected road
  const selectedRoad = useMemo(() => {
    return roads.find((r) => r.id === selectedRoadId) ?? filteredRoads[0] ?? roads[0];
  }, [roads, selectedRoadId, filteredRoads]);

  // Handle updates to road (e.g., from authority action simulation)
  const handleUpdateRoad = (updated: RoadSegment) => {
    setLocalRoads((prev) => (prev ?? overrides.roads).map((r) => (r.id === updated.id ? updated : r)));
  };

  return (
    <>
      <main className="pt-20 min-h-screen bg-slate-50 dark:bg-surface-base text-slate-900 dark:text-slate-100 font-sans pb-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Header & Breadcrumb */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider mb-1">
                <Navigation className="w-3.5 h-3.5" />
                <span>Road Intelligence, Safe Transit &amp; Journey Risk</span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span className="text-slate-500 dark:text-slate-400">Operational Transit Network</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Disaster Roadway Intelligence &amp; Safe Journey Planning
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Real-time roadway conditions, multi-hazard corridor exposure, destination safety checks, and alternative safe transit routing under disaster conditions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/map"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-accent text-slate-950 font-bold hover:bg-accent/90 shadow-sm transition-all"
              >
                <MapIcon className="w-4 h-4" />
                <span>View on GIS Map</span>
              </Link>
            </div>
          </div>

          {/* Journey Risk, Destination Safety & Route Planning section */}
          <div className="bg-white dark:bg-surface-card rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
            <div className="px-6 py-4.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-surface-elevated/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-accent mb-0.5">
                  OPERATIONAL DECISION SUPPORT · NATIONAL TRANSIT MONITOR
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>🗺️ Safe Corridor Planning &amp; Journey Risk Intelligence</span>
                  <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
                    · Multi-Factor Assessment
                  </span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Analyze origin-to-destination transit corridors, hazard exposures, road conditions, active alerts, and time-aware scenarios.
                </p>
              </div>
            </div>
            <div className="p-5 sm:p-7 min-h-[580px]">
              <RoutePlanner />
            </div>
          </div>

          {/* Notice banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200 backdrop-blur-sm">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>Public Travel Advisory &amp; Operations Notice</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider">
                  Advisory Only
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                Road conditions and inundation levels change rapidly during cyclone and monsoon events. Real-time road status is compiled from regional control centers, sensor stations, and verified ground reports. Do not attempt to cross flooded roadways, ford submerged causeways, or bypass official civil barricades.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Monitored</span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{counts.ALL}</div>
              <span className="text-[10px] text-slate-400">Road Segments</span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-emerald-500/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Passable</span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{counts.OPEN}</div>
              <span className="text-[10px] text-slate-400">Normal Conditions</span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-amber-500/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Caution</span>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{counts.CAUTION}</div>
              <span className="text-[10px] text-slate-400">Waterlogged / Slow</span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-orange-500/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Partially Blocked</span>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-0.5">{counts.PARTIALLY_BLOCKED}</div>
              <span className="text-[10px] text-slate-400">Single-lane Transit</span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-rose-500/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Blocked</span>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{counts.BLOCKED}</div>
              <span className="text-[10px] text-slate-400">Debris / Inundation</span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-purple-500/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">High Risk</span>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">{counts.HIGH_RISK}</div>
              <span className="text-[10px] text-slate-400">Travel Risk &gt;50/100</span>
            </div>
          </div>

          {/* Search and Filters */}
          <RoadFilters
            currentFilter={currentFilter}
            onChangeFilter={setCurrentFilter}
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            counts={counts}
          />

          {/* Main 2-Column Split: Road List (Left) + Detail Panel (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Column: Road Cards Directory */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
                <span>Showing {filteredRoads.length} {filteredRoads.length === 1 ? 'corridor' : 'corridors'}</span>
                <span className="text-[11px] text-slate-400">Click a corridor to inspect details</span>
              </div>

              {filteredRoads.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-surface-card rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
                  <Navigation className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                  {environment === 'REAL' && roads.length === 0 ? (
                    <>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Live road intelligence is not currently available
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Real-time roadway conditions and verified disruption reports will appear here when active in the operational zone.
                      </p>
                      <button
                        onClick={() => switchEnvironment('DEMO')}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Explore Scenario Disruptions in Demo</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching roads found</div>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        No road segments match the filter &quot;{currentFilter}&quot; and query &quot;{searchQuery}&quot;. Try resetting your filters.
                      </p>
                      <button
                        onClick={() => {
                          setCurrentFilter('ALL');
                          setSearchQuery('');
                        }}
                        className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                      >
                        Reset Filters
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
                  {filteredRoads.map((road) => (
                    <RoadCard
                      key={road.id}
                      road={road}
                      isSelected={selectedRoad?.id === road.id}
                      onSelect={(r) => setSelectedRoadId(r.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Selected Road Detailed Inspection & Authority Workflow */}
            <div className="lg:col-span-7">
              {selectedRoad ? (
                <div className="sticky top-20">
                  <RoadDetailPanel
                    road={selectedRoad}
                    relatedCitizenReports={environment === 'DEMO' ? demoCitizenReports : overrides.reports}
                    onUpdateRoad={handleUpdateRoad}
                    onSelectReport={(report) => setActiveReportModal(report)}
                    className="shadow-md"
                  />
                </div>
              ) : (
                <div className="p-12 text-center bg-white dark:bg-surface-card rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400">
                  Select a road segment from the list to view travel safety intelligence.
                </div>
              )}
            </div>

          </div>

          {/* Connected Report Modal if user clicks report from road panel */}
          {activeReportModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white dark:bg-surface-card rounded-2xl border border-slate-200 dark:border-white/15 p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Report #{activeReportModal.id}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                      {activeReportModal.reportType}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveReportModal(null)}
                    className="text-slate-400 hover:text-slate-200 p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Location</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{activeReportModal.address}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Description</span>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5">{activeReportModal.description}</p>
                  </div>

                  {activeReportModal.blockedRoadInfo && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-200">
                      <span className="font-bold block text-[10px] uppercase">Road Blockage Notice</span>
                      <p className="mt-0.5">{activeReportModal.blockedRoadInfo.roadName} — {activeReportModal.blockedRoadInfo.blockageType} ({activeReportModal.blockedRoadInfo.severity})</p>
                      {activeReportModal.blockedRoadInfo.description && (
                        <p className="text-[10px] opacity-75 mt-0.5">{activeReportModal.blockedRoadInfo.description}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/10 text-[11px] text-slate-500">
                    <span>Status: <strong className="text-slate-700 dark:text-slate-300">{activeReportModal.status}</strong></span>
                    <span>Confidence: <strong className="text-slate-700 dark:text-slate-300">{activeReportModal.preliminaryAnalysis.score}%</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveReportModal(null)}
                  className="w-full py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:opacity-90"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
