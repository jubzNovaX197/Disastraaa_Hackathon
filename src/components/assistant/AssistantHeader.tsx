'use client';

/**
 * AI Disaster Intelligence Assistant — Header
 */

import { LiveStatusIndicator } from '@/components/realtime/LiveStatusIndicator';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Bot, MapPin, Sparkles, Trash2 } from 'lucide-react';

export const OPERATIONAL_DISTRICTS = [
  'All Operational Sectors',
  'Cuttack District',
  'Puri District',
  'Khurda District',
  'Jagatsinghpur District',
  'Ganjam District',
  'Kendrapara District',
];

interface AssistantHeaderProps {
  selectedLocation: string;
  onSelectLocation: (loc: string) => void;
  onClearMessages: () => void;
  messageCount: number;
}

export function AssistantHeader({
  selectedLocation,
  onSelectLocation,
  onClearMessages,
  messageCount,
}: AssistantHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-3.5 py-3 sm:px-4 sm:py-3 bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-sm">
      {/* Title & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 flex-shrink-0">
          <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Intelligence Assistant
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Sparkles className="w-2.5 h-2.5" />
              Decision-Support AI
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.2">
            Ask questions about hazards, impacts, alerts, routes and emergency readiness
          </p>
        </div>
      </div>

      {/* Right Controls: Location Filter, Status Indicator, Theme, Clear */}
      <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
        {/* Location Focus Filter */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] text-xs">
          <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold hidden sm:inline">
            Focus:
          </span>
          <select
            value={selectedLocation}
            onChange={(e) => onSelectLocation(e.target.value)}
            className="bg-transparent font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer text-xs pr-1"
          >
            {OPERATIONAL_DISTRICTS.map((loc) => (
              <option key={loc} value={loc} className="bg-white dark:bg-surface-elevated text-slate-900 dark:text-white">
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Live Status Indicator */}
        <LiveStatusIndicator />

        {/* Theme Toggle */}
        <ThemeToggle size="sm" />

        {/* Clear Conversation */}
        {messageCount > 0 && (
          <button
            type="button"
            onClick={onClearMessages}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-slate-50 hover:bg-rose-50 dark:bg-white/[0.04] dark:hover:bg-rose-500/10 transition-colors"
            title="Clear conversation stream"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
