'use client';

import type { Shelter } from '@/data/types';
import type { AppEnvironment } from '@/lib/env';
import { cn } from '@/lib/utils';
import {
  Activity,
  CheckCircle2,
  HeartPulse,
  Home,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Utensils,
  Zap
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface SheltersPageClientProps {
  initialShelters: Shelter[];
  environment: AppEnvironment;
}

export function SheltersPageClient({ initialShelters, environment }: SheltersPageClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredShelters = useMemo(() => {
    return initialShelters.filter((s) => {
      const matchesSearch =
        search.trim() === '' ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.address.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [initialShelters, search, statusFilter]);

  const isDemo = environment === 'DEMO';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-accent/15 text-cyan-600 dark:text-accent">
              <Home className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Emergency Shelters & Relief Centers
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Real-time shelter occupancy, emergency medical capacity, and basic relief amenities.
          </p>
        </div>

        {/* Environment Badge */}
        <div className="flex items-center">
          {isDemo ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulation Environment (Scenario Shelters)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5" />
              <span>Live Operational Feed (Verified Shelters)</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by shelter name or locality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'OPEN', 'PREPARING', 'FULL'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap border',
                statusFilter === status
                  ? 'bg-accent text-slate-950 border-accent font-semibold'
                  : 'bg-white dark:bg-surface-card border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5',
              )}
            >
              {status === 'ALL' ? 'All Shelters' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Shelter Grid */}
      {filteredShelters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShelters.map((shelter) => {
            const occupancyPct =
              shelter.capacity > 0 ? Math.round((shelter.occupancy / shelter.capacity) * 100) : 0;
            return (
              <div
                key={shelter.id}
                className="p-5 rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                      {shelter.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{shelter.address}</span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                      shelter.status === 'OPEN'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : shelter.status === 'PREPARING'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
                    )}
                  >
                    {shelter.status}
                  </span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Occupancy</span>
                    <span className="text-slate-900 dark:text-slate-200 font-mono font-semibold">
                      {shelter.occupancy} / {shelter.capacity} ({occupancyPct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        occupancyPct > 85
                          ? 'bg-rose-500'
                          : occupancyPct > 60
                          ? 'bg-amber-500'
                          : 'bg-emerald-500',
                      )}
                      style={{ width: `${Math.min(100, occupancyPct)}%` }}
                    />
                  </div>
                </div>

                {/* Amenity Badges */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  {shelter.hasMedical && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px]">
                      <HeartPulse className="w-3 h-3" /> Medical
                    </span>
                  )}
                  {shelter.hasFood && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px]">
                      <Utensils className="w-3 h-3" /> Food Rations
                    </span>
                  )}
                  {shelter.hasPower && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px]">
                      <Zap className="w-3 h-3" /> Power
                    </span>
                  )}
                </div>

                {shelter.contactPhone && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Emergency Contact: {shelter.contactPhone}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {isDemo
              ? 'No matching shelters found'
              : 'No operational shelter data is currently available'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isDemo
              ? 'Try adjusting your search filter to see simulated shelter records.'
              : 'Municipal cyclone relief centers and emergency shelters will appear here when activated by local disaster management authorities.'}
          </p>
          {!isDemo && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 inline-flex items-center gap-3 text-[11px] text-slate-500">
              <span>Status: Monitoring / Normal Standby</span>
              <span>•</span>
              <span>Source: Municipal Relief Feed</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
