import type { Metadata } from 'next';
import { Bell, ShieldCheck, Radio, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { EmptyState, Badge } from '@/components/ui';
import { Footer } from '@/components/layout/Footer';
import { resolveServerEnvironment } from '@/lib/env';
import { getAlertProvider } from '@/lib/providers';

export const metadata: Metadata = { title: 'Alerts' };

export default async function AlertsPage() {
  const env = await resolveServerEnvironment();
  const alertProvider = getAlertProvider(env);
  const alerts = await alertProvider.getAlerts();

  const isDemo = env === 'DEMO';

  return (
    <>
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-100">Active Alerts</h1>
                {isDemo ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    SIMULATION / DEMO DATA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    LIVE OPERATIONAL
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {isDemo
                  ? 'Demonstration disaster warnings and simulated operational advisories'
                  : 'Real-time verified disaster warnings and official authority notifications'}
              </p>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-slate-400" />
              <span>Environment: <strong className="text-slate-300 font-mono">{env}</strong></span>
            </div>
          </header>

          {alerts.length === 0 ? (
            <div className="rounded-xl bg-surface-card border border-white/[0.07] p-8 text-center">
              <EmptyState
                icon={<ShieldCheck className="w-6 h-6 text-emerald-400" />}
                title="No active operational alerts available"
                description={
                  isDemo
                    ? 'No simulation alerts are currently loaded in this scenario.'
                    : 'Disaster monitoring feeds and early warning radar systems are standing by. Official notifications and meteorological advisories will be broadcast here when active hazards occur.'
                }
              />
              <div className="mt-4 pt-4 border-t border-white/[0.05] inline-flex items-center gap-4 text-xs text-slate-500">
                <span>Source: {isDemo ? 'Simulation Engine' : 'National Warning Feeds (Standby)'}</span>
                <span>•</span>
                <span>Status: {isDemo ? 'Simulation Inactive' : 'All Clear / Monitoring'}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl bg-surface-card border border-white/[0.08] p-5 hover:border-white/[0.15] transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-slate-100">{alert.title}</h3>
                    </div>
                    <Badge severity={alert.severity} dot>
                      {alert.severity}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{alert.message}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{alert.regionName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(alert.issuedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
