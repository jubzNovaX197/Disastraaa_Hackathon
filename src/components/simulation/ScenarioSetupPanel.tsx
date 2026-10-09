'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import type {
  ScenarioConfiguration,
  ScenarioDuration,
  ScenarioHazard,
  ScenarioIntensity,
} from '@/lib/simulation/types';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  Gauge,
  Layers,
  MapPin,
  Settings2,
  Users,
  Waves,
  Wind
} from 'lucide-react';
import { useState } from 'react';

interface ScenarioSetupPanelProps {
  config: ScenarioConfiguration;
  onChange: (updated: ScenarioConfiguration) => void;
  availableRegions: { id: string; name: string }[];
}

const INTENSITY_CONFIG: Record<
  ScenarioIntensity,
  { label: string; activeClass: string; inactiveClass: string }
> = {
  LOW: {
    label: 'Low',
    activeClass:
      'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400 dark:bg-emerald-600 dark:text-white',
    inactiveClass:
      'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10',
  },
  MODERATE: {
    label: 'Moderate',
    activeClass:
      'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30 ring-1 ring-blue-400 dark:bg-blue-600 dark:text-white',
    inactiveClass:
      'text-blue-700 dark:text-blue-400 hover:bg-blue-500/10',
  },
  HIGH: {
    label: 'High',
    activeClass:
      'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30 ring-1 ring-amber-400 dark:bg-amber-600 dark:text-white',
    inactiveClass:
      'text-amber-700 dark:text-amber-400 hover:bg-amber-500/10',
  },
  EXTREME: {
    label: 'Extreme',
    activeClass:
      'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30 ring-1 ring-rose-400 dark:bg-rose-600 dark:text-white',
    inactiveClass:
      'text-rose-700 dark:text-rose-400 hover:bg-rose-500/10',
  },
};

export function ScenarioSetupPanel({
  config,
  onChange,
  availableRegions,
}: ScenarioSetupPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const handleHazardSelect = (hazard: ScenarioHazard) => {
    onChange({ ...config, hazard });
  };

  const handleIntensitySelect = (intensity: ScenarioIntensity) => {
    onChange({ ...config, intensity });
  };

  const handleDurationSelect = (duration: ScenarioDuration) => {
    onChange({ ...config, duration });
  };

  const handleRegionSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...config, targetRegionId: e.target.value });
  };

  const handlePopMultiplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...config,
      populationExposureMultiplier: parseFloat(e.target.value),
    });
  };

  const handleAdvancedChange = <K extends keyof ScenarioConfiguration['advanced']>(
    key: K,
    val: ScenarioConfiguration['advanced'][K],
  ) => {
    onChange({
      ...config,
      advanced: {
        ...config.advanced,
        [key]: val,
      },
    });
  };

  const hazardTabs: { id: ScenarioHazard; label: string; icon: typeof Waves }[] = [
    { id: 'FLOOD', label: 'Flood', icon: Waves },
    { id: 'CYCLONE', label: 'Cyclone', icon: Wind },
    { id: 'MULTI_HAZARD', label: 'Combined', icon: Layers },
  ];

  const intensities: ScenarioIntensity[] = ['LOW', 'MODERATE', 'HIGH', 'EXTREME'];
  const durations: ScenarioDuration[] = ['6h', '12h', '24h', '48h', '72h'];

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
      <DataProvenance model source="Simulated" />
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-white/[0.06]">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-purple-500" />
          <span>Scenario Configuration</span>
        </h2>
        <span className="text-[11px] text-slate-400">
          Define simulated operational conditions
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Hazard Selection */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
            Hazard Type
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10">
            {hazardTabs.map(({ id, label, icon: Icon }) => {
              const isSelected = config.hazard === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleHazardSelect(id)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-semibold transition-all',
                    isSelected
                      ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30 ring-1 ring-purple-400 dark:bg-purple-600 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08]',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Intensity Scale */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
            Intensity Scale
          </label>
          <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10">
            {intensities.map((id) => {
              const isSelected = config.intensity === id;
              const cfg = INTENSITY_CONFIG[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleIntensitySelect(id)}
                  className={cn(
                    'py-2 px-1 rounded-md text-xs transition-all text-center font-bold',
                    isSelected ? cfg.activeClass : cfg.inactiveClass,
                  )}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Duration */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
            Scenario Duration
          </label>
          <div className="grid grid-cols-5 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10">
            {durations.map((d) => {
              const isSelected = config.duration === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDurationSelect(d)}
                  className={cn(
                    'py-2 px-1 rounded-md text-xs font-semibold transition-all text-center',
                    isSelected
                      ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30 ring-1 ring-purple-400 dark:bg-purple-600 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08]',
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Target Area */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
            Target Operational Region
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={config.targetRegionId}
              onChange={handleRegionSelect}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium cursor-pointer shadow-sm"
            >
              <option value="ALL" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                All Operational Corridors (Multi-Zone)
              </option>
              {availableRegions.map((r) => (
                <option key={r.id} value={r.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Population Exposure Range Control */}
      <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-500 flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Population Exposure Scaling
            </div>
            <div className="text-[11px] text-slate-400">
              Controlled demographic exposure multiplier (current factor: {config.populationExposureMultiplier.toFixed(1)}x)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-72">
          <input
            type="range"
            min="0.6"
            max="1.8"
            step="0.1"
            value={config.populationExposureMultiplier}
            onChange={handlePopMultiplierChange}
            className="w-full accent-purple-600 dark:accent-purple-400 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 w-14 text-center">
            {(config.populationExposureMultiplier * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Advanced Conditions Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>{showAdvanced ? 'Hide Advanced Meteorological & Stress Modifiers' : 'Show Advanced Meteorological & Stress Modifiers'}</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 mt-2.5">
            {/* Rainfall */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Additional Rainfall (24h)</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  +{config.advanced.rainfallMm24h} mm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="250"
                step="10"
                value={config.advanced.rainfallMm24h}
                onChange={(e) => handleAdvancedChange('rainfallMm24h', parseInt(e.target.value))}
                className="w-full accent-blue-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* River Gauge Level */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">River Gauge Inflow</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  +{config.advanced.riverSurgeMeters.toFixed(1)} m
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="3.5"
                step="0.1"
                value={config.advanced.riverSurgeMeters}
                onChange={(e) => handleAdvancedChange('riverSurgeMeters', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* Wind Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Sustained Gale Wind</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {config.advanced.windSpeedKmh} km/h
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="210"
                step="10"
                value={config.advanced.windSpeedKmh}
                onChange={(e) => handleAdvancedChange('windSpeedKmh', parseInt(e.target.value))}
                className="w-full accent-purple-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* Storm Surge */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Coastal Storm Surge</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  +{config.advanced.stormSurgeMeters.toFixed(1)} m
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="4.5"
                step="0.2"
                value={config.advanced.stormSurgeMeters}
                onChange={(e) => handleAdvancedChange('stormSurgeMeters', parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* Road Network Disruption */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block">
                Road Network Impairment
              </label>
              <select
                value={config.advanced.roadDisruptionLevel}
                onChange={(e) =>
                  handleAdvancedChange(
                    'roadDisruptionLevel',
                    e.target.value as ScenarioConfiguration['advanced']['roadDisruptionLevel'],
                  )
                }
                className="w-full px-2.5 py-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                <option value="NORMAL" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  Normal Passability
                </option>
                <option value="ELEVATED" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  Elevated Waterlogging
                </option>
                <option value="SEVERE" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  Severe Debris &amp; Inundation
                </option>
                <option value="CRITICAL" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  Critical Structural Washouts
                </option>
              </select>
            </div>

            {/* Local Resource Deficit */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Stockpile Deficit Stress</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  -{config.advanced.resourceDeficitPct}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                step="5"
                value={config.advanced.resourceDeficitPct}
                onChange={(e) => handleAdvancedChange('resourceDeficitPct', parseInt(e.target.value))}
                className="w-full accent-rose-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
