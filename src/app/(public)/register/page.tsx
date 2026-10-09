import { RegisterAccountTabs } from '@/components/auth/RegisterAccountTabs';
import { Eye, UserPlus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Create Account',
  description:
    'Create your Disastraaa account — choose between Citizen / Public account or Authority Personnel activation.',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-surface-base text-slate-100 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mx-auto">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Create your account</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Select your account type to proceed with registration or authority activation.
          </p>
        </div>

        <Suspense fallback={null}>
          <RegisterAccountTabs />
        </Suspense>

        <div className="pt-2 flex justify-center">
          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Continue to Public Situation Map
          </Link>
        </div>
      </div>
    </div>
  );
}
