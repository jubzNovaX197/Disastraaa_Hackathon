'use client';

import { useState } from 'react';
import { Bell, Clock, MapPin, AlertTriangle, ExternalLink, ChevronRight, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import type { DemoAlert } from '@/data/types';
import { cn } from '@/lib/utils';

interface ActiveAlertsOperationsPanelProps {
  alerts: DemoAlert[];
}

export function ActiveAlertsOperationsPanel({ alerts }: ActiveAlertsOperationsPanelProps) {
  const [selectedAlert, setSelectedAlert] = useState<DemoAlert | null>(null);

  const activeAlerts = alerts.filter((a) => a.isActive);

  return (
    <Card className="bg-surface-card/95 border-white/[0.08] shadow-lg">
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
            <Bell className="w-4 h-4" />
          </span>
          <div>
            <CardTitle className="text-sm font-bold text-slate-100">
              Active Warnings & Broadcast Alerts
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Common Alerting Protocol (CAP) synchronized warnings
            </p>
          </div>
        </div>
        <Badge severity="CRITICAL" dot className="text-xs">
          {activeAlerts.length} Active
        </Badge>
      </div>

      <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto">
        {activeAlerts.map((alert) => (
          <div
            key={alert.id}
            onClick={() => setSelectedAlert(alert)}
            className="p-3.5 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group flex items-start justify-between gap-3 text-xs"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge severity={alert.severity} className="text-[10px]">
                  {alert.severity}
                </Badge>
                <span className="font-semibold text-slate-200 group-hover:text-accent transition-colors truncate">
                  {alert.title}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] line-clamp-1">{alert.message}</p>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap pt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {alert.regionName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Issued {new Date(alert.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="p-1.5 rounded-lg bg-white/5 group-hover:bg-accent/15 text-slate-400 group-hover:text-accent transition-colors flex-shrink-0"
              title="Inspect Alert"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Alert modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-card border border-white/10 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div>
                <Badge severity={selectedAlert.severity} className="mb-1 text-xs">
                  {selectedAlert.severity} WARNING
                </Badge>
                <h3 className="text-base font-bold text-slate-100">{selectedAlert.title}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-accent" />
                  {selectedAlert.regionName}
                </p>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-elevated border border-white/[0.06] text-xs text-slate-300 leading-relaxed">
              {selectedAlert.message}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white/5">
                <span className="text-slate-400 text-[10px] block font-semibold uppercase">Issued</span>
                <span className="text-slate-200 font-mono">
                  {new Date(selectedAlert.issuedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5">
                <span className="text-slate-400 text-[10px] block font-semibold uppercase">Valid Until</span>
                <span className="text-slate-200 font-mono">
                  {new Date(selectedAlert.expiresAt ?? selectedAlert.issuedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
              >
                Close Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
