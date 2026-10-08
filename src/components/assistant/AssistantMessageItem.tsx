'use client';

/**
 * AI Disaster Intelligence Assistant — Message Bubble & Structured Cards
 */

import { useState } from 'react';
import {
  Bot,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Database,
  Clock,
  Layers,
  Sparkles,
  MapPin,
} from 'lucide-react';
import type { AssistantMessage, DataQualityBadge } from '@/lib/ai/types';
import { cn } from '@/lib/utils';

interface AssistantMessageItemProps {
  message: AssistantMessage;
}

const QUALITY_BADGE_CONFIG: Record<DataQualityBadge, { label: string; className: string }> = {
  VERIFIED: {
    label: 'Verified',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  PREDICTED: {
    label: 'Predicted Model',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  SIMULATED: {
    label: 'Simulated Stream',
    className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  CITIZEN_REPORT: {
    label: 'Citizen Reported',
    className: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  },
  HISTORICAL: {
    label: 'Historical Benchmark',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  LIVE_UPDATED: {
    label: 'Live Synchronized',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
};

export function AssistantMessageItem({ message }: AssistantMessageItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end gap-2.5 max-w-3xl ml-auto animate-in fade-in duration-150">
        <div className="space-y-1 text-right">
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-cyan-600 text-white shadow-sm text-sm inline-block text-left">
            <p className="font-normal leading-relaxed">{message.content}</p>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono px-1">
            {message.timestamp}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-cyan-700 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  // Assistant Message with Structured Rendering
  const sec = message.structuredSections;

  return (
    <div className="flex items-start gap-3 max-w-4xl mr-auto w-full animate-in fade-in duration-200">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 mt-1">
        <Bot className="w-4 h-4" />
      </div>

      {/* Message Body Card */}
      <div className="flex-1 bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-sm overflow-hidden text-sm">
        {/* Card Header: Provider, Quality Badges, Location, Copy */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              Intelligence Assistant
            </span>

            {message.locationFocus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200/80 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                <MapPin className="w-3 h-3 text-cyan-500" />
                {message.locationFocus}
              </span>
            )}

            {/* Data Quality Badges */}
            {message.dataQuality?.map((badge) => {
              const cfg = QUALITY_BADGE_CONFIG[badge];
              if (!cfg) return null;
              return (
                <span
                  key={badge}
                  className={cn('px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider', cfg.className)}
                >
                  {cfg.label}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
            <span>{message.timestamp}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Copy answer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Structured Sections Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {sec ? (
            <>
              {/* 1. Situation Briefing */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-elevated/80 border border-slate-200/80 dark:border-white/[0.08]">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                  Situation
                </h4>
                <p className="text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                  {sec.situation}
                </p>
              </div>

              {/* 2. Key Factors */}
              {sec.keyFactors && sec.keyFactors.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Key Factors
                  </h4>
                  <ul className="space-y-1.5">
                    {sec.keyFactors.map((factor, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-slate-700 dark:text-slate-300 text-xs sm:text-sm"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 flex-shrink-0" />
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3. Current Data Metric Cards */}
              {sec.currentData && Object.keys(sec.currentData).length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Current Operational Data
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Object.entries(sec.currentData).map(([metric, val]) => (
                      <div
                        key={metric}
                        className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06]"
                      >
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                          {metric}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                          {String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Operational Context */}
              {sec.operationalContext && (
                <div className="p-3 rounded-xl bg-purple-500/5 dark:bg-purple-500/[0.04] border border-purple-500/20 text-xs text-slate-700 dark:text-slate-300">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
                    Operational Context
                  </h4>
                  <p className="leading-relaxed">{sec.operationalContext}</p>
                </div>
              )}

              {/* 5. Data Freshness */}
              {sec.dataFreshness && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{sec.dataFreshness}</span>
                </div>
              )}
            </>
          ) : (
            /* Fallback generic markdown display if structured sections missing */
            <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
              {message.content}
            </div>
          )}
        </div>

        {/* Sources Bar */}
        {message.sources && message.sources.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Database className="w-3 h-3 text-cyan-500" />
              Based on:
            </span>
            {message.sources.map((src) => (
              <span
                key={src}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-surface-elevated text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10"
              >
                {src}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
