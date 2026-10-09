import { HistoricalAnalysisPanel } from '@/components/historical/HistoricalAnalysisPanel';
import { brand } from '@/config/brand';
import { demoHistoricalEvents } from '@/data/demo/historicalEvents';
import { sortByRecent, summariseEvents } from '@/lib/historical/engine';
import type { Metadata } from 'next';
import { HistoricalDashboardStats } from './HistoricalDashboardStats';

import { resolveServerEnvironment } from '@/lib/env';

export const metadata: Metadata = {
  title: `Historical Analysis | ${brand.name}`,
  description:
    'Historical disaster event analysis — patterns, impact summary, and event records for Odisha and Andhra Pradesh.',
};

export default async function HistoricalPage() {
  const env = await resolveServerEnvironment();
  const isDemo = env === 'DEMO';
  const events = isDemo ? demoHistoricalEvents : [];
  const summary      = summariseEvents(events);
  const recentEvents = sortByRecent(events).slice(0, 3);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Historical Analysis</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {brand.name} · Disaster History · {isDemo ? 'Simulation Scenario Dataset' : 'Live Operational Mode'}
          </p>
        </div>
        {isDemo ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-medium">
            ⚠️ Demo Data — Simulation Records
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            LIVE OPERATIONAL — Standby for Historical Feeds
          </div>
        )}
      </header>

      {/* Top stat cards */}
      <HistoricalDashboardStats summary={summary} />

      {/* Main content — responsive grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Full historical panel */}
        <div className="lg:col-span-2">
          <HistoricalAnalysisPanel
            summary={summary}
            events={events}
            title={isDemo ? `All Regions · ${events.length} Events` : 'All Regions · 0 Records (Operational Feeds Standby)'}
            className="h-full"
          />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Recent events quick-view */}
          <div className="rounded-xl bg-surface-card border border-white/[0.07] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.07]">
              <h2 className="text-sm font-semibold text-slate-100">Most Recent Records</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isDemo ? 'Latest 3 events in simulation dataset' : 'Operational disaster records'}
              </p>
            </div>
            {recentEvents.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500">
                No historical operational records currently queried from connected archives.
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {recentEvents.map((ev) => (
                <li key={ev.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0">
                      {ev.type === 'FLOOD' ? '🌊' :
                       ev.type === 'CYCLONE' ? '🌀' :
                       ev.type === 'STORM_SURGE' ? '🌊' :
                       ev.type === 'LANDSLIDE' ? '⛰️' : '⚠️'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{ev.name}</p>
                      <p className="text-[11px] text-slate-500">{ev.regionName} · {ev.year}</p>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-bold ml-auto
                      ${ev.severity === 'CRITICAL' ? 'text-critical' :
                        ev.severity === 'HIGH' ? 'text-orange-400' :
                        ev.severity === 'MODERATE' ? 'text-warning' : 'text-safe'}`}>
                      {ev.severity}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>

          {/* Future integration note */}
          <div className="rounded-xl bg-surface-card border border-white/[0.07] px-4 py-4">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              🔗 Future Data Sources
            </h3>
            <ul className="space-y-1.5 text-[11px] text-slate-500">
              {[
                'NDMA / SDMA historical records',
                'IMD rainfall archives',
                'India Meteorological Dept. cyclone tracks',
                'NRSC satellite damage assessments',
                'PostGIS GIS boundary integration',
                'ML-based trend analysis',
              ].map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <span className="text-slate-700 mt-0.5">○</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-slate-600 mt-3 leading-relaxed">
              Architecture is designed for zero-rewrite integration — swap the demo dataset for any of these sources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
