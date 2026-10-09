'use client';

/**
 * LoginAccessTabs
 *
 * Thin additive wrapper around the existing /login route: DemoAccessPortal
 * remains the default view, completely unmodified — this only adds a small
 * corner toggle to a real Authority Sign In panel, and a matching way back.
 * Demo Access and real account auth stay fully independent; this component
 * never shares cookies or state between the two.
 */

import type { Role } from '@/types/roles';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Suspense, useState } from 'react';
import { AccountAuthForm } from './AccountAuthForm';
import { DemoAccessPortal } from './DemoAccessPortal';

interface LoginAccessTabsProps {
  initialRole?: Role;
}

export function LoginAccessTabs({ initialRole }: LoginAccessTabsProps) {
  const [tab, setTab] = useState<'demo' | 'account'>('demo');

  if (tab === 'account') {
    return (
      <div className="min-h-screen bg-surface-base text-slate-100 flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-100">Authority Sign In</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your official email and password to access your authority dashboard.
            </p>
          </div>

          <Suspense fallback={null}>
            <AccountAuthForm mode="login" />
          </Suspense>

          <div className="pt-2 border-t border-white/[0.06] flex justify-center">
            <button
              type="button"
              onClick={() => setTab('demo')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Looking for Demo Access instead?
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={() => setTab('account')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors backdrop-blur-xl"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Authority Sign In
        </button>
      </div>
      <DemoAccessPortal initialRole={initialRole} />
    </div>
  );
}
