/**
 * PlannedFeaturePage
 *
 * Professional placeholder for features planned for production release.
 * Prevents raw 404s and preserves the full operational dashboard layout.
 */

import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  Shield,
  Layers,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Card, CardTitle, Badge } from '@/components/ui';

interface PlannedFeaturePageProps {
  title: string;
  category: string;
  description: string;
  plannedCapabilities: string[];
  mockDataSummary?: { label: string; value: string }[];
  icon?: React.ElementType;
}

export function PlannedFeaturePage({
  title,
  category,
  description,
  plannedCapabilities,
  mockDataSummary,
  icon: Icon = Layers,
}: PlannedFeaturePageProps) {
  return (
    <div className="p-4 sm:p-6 max-w-[1400px] w-full mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-accent transition-colors">
          Command Center
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400">{category}</span>
        <span className="text-slate-600">/</span>
        <span className="text-slate-200 font-semibold">{title}</span>
      </div>

      <div className="bg-surface-card border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center flex-shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {title}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Planned for Production · Phase 2
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Disastraaa Multi-Hazard Operational Architecture Module ({category})
              </p>
            </div>
          </div>

          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            Switch Demo Role
          </Link>
        </div>

        {/* Feature Overview */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Operational Specification
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Capabilities Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Planned Production Capabilities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plannedCapabilities.map((cap, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-surface-elevated/40 border border-white/[0.04] flex items-start gap-2.5 text-xs text-slate-300"
              >
                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry Mock Stats if available */}
        {mockDataSummary && mockDataSummary.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Telemetry Integration Status
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {mockDataSummary.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-surface-base border border-white/[0.04] space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">{item.label}</div>
                  <div className="text-sm font-bold text-slate-200">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-accent text-slate-950 hover:bg-accent/90 transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Command Center
          </Link>

          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            <span>Open Live Situation Map</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
