'use client';

import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import { DEMO_STAGES } from '@/lib/simulation/demoScenario';
import { Languages, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { useState } from 'react';

const COPY = {
  en: { run: 'Run demo scenario', stop: 'Stop', reset: 'Reset', capacity: 'Puri shelter capacity', risk: 'Population at risk (scenario estimate)', gap: 'Additional places needed' },
  hi: { run: 'डेमो परिदृश्य चलाएँ', stop: 'रोकें', reset: 'रीसेट', capacity: 'पुरी आश्रय क्षमता', risk: 'जोखिम में आबादी (अनुमान)', gap: 'अतिरिक्त स्थान आवश्यक' },
  or: { run: 'ଡେମୋ ପରିସ୍ଥିତି ଚଲାନ୍ତୁ', stop: 'ବନ୍ଦ କରନ୍ତୁ', reset: 'ପୁନଃ ଆରମ୍ଭ', capacity: 'ପୁରୀ ଆଶ୍ରୟ କ୍ଷମତା', risk: 'ବିପଦରେ ଜନସଂଖ୍ୟା (ଆକଳନ)', gap: 'ଅତିରିକ୍ତ ସ୍ଥାନ ଆବଶ୍ୟକ' },
  bn: { run: 'ডেমো পরিস্থিতি চালান', stop: 'থামান', reset: 'রিসেট', capacity: 'পুরী আশ্রয় ক্ষমতা', risk: 'ঝুঁকিতে জনসংখ্যা (অনুমান)', gap: 'অতিরিক্ত স্থান প্রয়োজন' },
};

export function DemoScenarioControls({ compact = false }: { compact?: boolean }) {
  const { environment, demoStep, demoRunning, runDemoScenario, stopDemoScenario, resetToBaseline, overrides } = useLiveIntelligence();
  const [language, setLanguage] = useState<keyof typeof COPY>('en');

  if (environment !== 'DEMO') return null;

  const copy = COPY[language];
  const shelters = overrides.shelters.filter(shelter => shelter.id.startsWith('sh-puri-'));
  const capacity = shelters.reduce((sum, shelter) => sum + shelter.capacity, 0);
  const occupied = shelters.reduce((sum, shelter) => sum + shelter.occupancy, 0);
  const population = overrides.riskZones?.find(zone => zone.id === 'rz-puri-coast')?.affectedPopulation ?? 285000;
  // Planning assumption: ~10% of affected population in emergency zones typically require temporary shelter
  const demand = Math.ceil(population * 0.1);

  return (
    <section
      aria-label="Demo scenario"
      lang={language}
      className="rounded-2xl border border-amber-500/30 bg-slate-950/90 backdrop-blur-xl text-slate-100 p-4 shadow-2xl space-y-3 font-sans transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-[11px] font-bold text-amber-300 tracking-wide">
            Simulated · Puri / Odisha
          </span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Languages className="w-3 h-3 text-slate-400" />
          <select
            aria-label="Demo language"
            value={language}
            onChange={event => setLanguage(event.target.value as keyof typeof COPY)}
            className="bg-slate-900/90 rounded-md border border-white/15 text-[11px] px-2 py-0.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="or">ଓଡ଼ିଆ</option>
            <option value="bn">বাংলা</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={demoRunning}
          onClick={runDemoScenario}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          <Play className="w-3 h-3 fill-slate-950" />
          <span>{copy.run}</span>
        </button>

        {demoRunning && (
          <button
            type="button"
            onClick={stopDemoScenario}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 border border-white/20 rounded-lg hover:bg-white/10 text-slate-200 transition-all active:scale-95"
          >
            <Pause className="w-3 h-3 text-amber-400" />
            <span>{copy.stop}</span>
          </button>
        )}

        <button
          type="button"
          onClick={resetToBaseline}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 border border-white/20 rounded-lg hover:bg-white/10 text-slate-200 transition-all active:scale-95 ml-auto"
        >
          <RotateCcw className="w-3 h-3 text-slate-400" />
          <span>{copy.reset}</span>
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <p role="status" aria-live="polite" className="font-medium text-slate-200">
            {demoStep}/4 · {DEMO_STAGES[demoStep]}
          </p>
          <span className="text-[10px] font-mono text-amber-400/80">Step {demoStep} of 4</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <progress aria-label="Demo progression" max={4} value={demoStep} className="hidden" />
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${(demoStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {!compact && (
        <div className="text-xs space-y-1.5 border-t border-white/10 pt-2.5 bg-slate-900/40 -mx-4 -mb-4 px-4 py-3 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">
              {copy.capacity}:{' '}
              <strong className="font-semibold text-slate-100">
                {occupied.toLocaleString('en-US')} / {capacity.toLocaleString('en-US')}
              </strong>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">{copy.risk}:</span>
            <strong className="font-semibold text-slate-100">{population.toLocaleString('en-US')}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">{copy.gap}:</span>
            <strong className={`font-semibold ${demand > capacity ? 'text-amber-400' : 'text-emerald-400'}`}>
              {Math.max(0, demand - capacity).toLocaleString('en-US')}
            </strong>
          </div>
          <p className="text-slate-500 text-[10px] pt-1 leading-relaxed border-t border-white/5">
            Model output · assumes 10% need shelter. Fictional scenario for disaster preparedness simulation.
          </p>
        </div>
      )}
    </section>
  );
}
