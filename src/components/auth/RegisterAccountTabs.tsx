'use client';

import { cn } from '@/lib/utils';
import { LogIn, ShieldCheck, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AccountAuthForm } from './AccountAuthForm';
import { CitizenRegisterForm } from './CitizenRegisterForm';

export type RegisterAccountType = 'citizen' | 'authority';

export function RegisterAccountTabs() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') === 'authority' ? 'authority' : 'citizen';
  const [accountType, setAccountType] = useState<RegisterAccountType>(initialType);

  useEffect(() => {
    const qType = searchParams.get('type');
    if (qType === 'authority' || qType === 'citizen') {
      setAccountType(qType);
    }
  }, [searchParams]);

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Account Type Selector — Two distinct paths */}
      <div className="p-1 rounded-2xl bg-white/[0.03] border border-white/10 grid grid-cols-2 gap-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setAccountType('citizen')}
          className={cn(
            'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all',
            accountType === 'citizen'
              ? 'bg-gradient-to-r from-accent to-cyan-400 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]',
          )}
        >
          <User className="w-4 h-4" />
          <span>Citizen / Public</span>
        </button>

        <button
          type="button"
          onClick={() => setAccountType('authority')}
          className={cn(
            'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all',
            accountType === 'authority'
              ? 'bg-gradient-to-r from-accent to-cyan-400 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]',
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Authority Account</span>
        </button>
      </div>

      {/* Path Context Explainer */}
      <div className="text-center space-y-1.5 px-2">
        {accountType === 'citizen' ? (
          <>
            <h2 className="text-lg font-bold text-slate-100">Citizen / Public Account</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Register for verified local disaster warnings, evacuation guidance, and nearby emergency shelters.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-slate-100">Authority Personnel Activation</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Activate an authorized agency account using your assigned Authority ID and official email.
              Role, department and jurisdiction are assigned server-side from your authorization record.
            </p>
          </>
        )}
      </div>

      {/* Selected Form Path */}
      <div className="bg-surface-card border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-xl">
        {accountType === 'citizen' ? (
          <CitizenRegisterForm />
        ) : (
          <AccountAuthForm mode="register" />
        )}
      </div>

      {/* Cross Links per Spec */}
      <div className="pt-2 border-t border-white/[0.06] flex flex-col items-center gap-2.5 text-xs text-slate-500">
        <p className="flex items-center gap-1.5">
          <span>Already have an account?</span>
          <Link href="/login" className="text-accent hover:underline font-medium inline-flex items-center gap-1">
            <LogIn className="w-3.5 h-3.5" />
            Sign in
          </Link>
        </p>

        <Link
          href="/demo"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-accent transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          Explore Demo Access
        </Link>
      </div>
    </div>
  );
}
