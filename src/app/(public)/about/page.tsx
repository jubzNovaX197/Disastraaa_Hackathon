import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { brand } from '@/config/brand';

export const metadata: Metadata = { title: 'About' };

const pipeline = [
  {
    step: 'DETECT',
    desc: 'Multi-source hazard detection — weather APIs, river sensors, satellite data, and citizen reports.',
  },
  {
    step: 'ASSESS',
    desc: 'Geospatial risk scoring combining rainfall, elevation, population density and historical impact.',
  },
  {
    step: 'PREDICT',
    desc: 'AI-assisted projection of likely hazard evolution and affected areas over the next 24–72 hours.',
  },
  {
    step: 'PLAN',
    desc: 'Resource allocation planning — shelters, rescue teams, vehicles and evacuation routes.',
  },
  {
    step: 'RESPOND',
    desc: 'Real-time coordination dashboard for state, district and block authorities.',
  },
  {
    step: 'PROTECT',
    desc: 'Citizen guidance, public alerts, and post-event resilience planning from historical data.',
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <main className="pt-16 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-3xl font-bold text-slate-100 mb-3">
              About {brand.name}
            </h1>
            <p className="text-slate-400 leading-relaxed">
              {brand.name} is an AI-powered geospatial disaster intelligence and
              response platform designed for India&apos;s multi-hazard environment.
              It unifies flood, cyclone, heatwave and other hazard data into a
              single operational picture — for authorities, citizens and
              response teams.
            </p>
          </header>

          {/* Pipeline */}
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-slate-100 mb-6">
              Response Pipeline
            </h2>
            <div className="space-y-3">
              {pipeline.map(({ step, desc }, i) => (
                <div
                  key={step}
                  className="flex gap-4 p-4 rounded-xl bg-surface-card border border-white/[0.07]"
                >
                  <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
                    <span className="text-[10px] font-mono font-semibold text-accent tracking-widest">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {i < pipeline.length - 1 && (
                      <div className="w-px h-full bg-white/[0.06] mt-1" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300 font-mono tracking-widest mb-1">
                      {step}
                    </p>
                    <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Disclaimer */}
          <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
            <p className="text-xs text-warning/80 leading-relaxed">
              <strong className="text-warning">Prototype notice:</strong>{' '}
              {brand.name} {brand.version} uses demonstration data only and is
              not connected to live government data sources. It is not intended
              for operational use in real disaster situations.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
