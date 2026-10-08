import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LogIn } from 'lucide-react';
import { AccountAuthForm } from '@/components/auth/AccountAuthForm';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Disastraaa account.',
};

/**
 * Real sign-in page — entirely separate from Demo Access (`/demo`) and
 * Registration (`/register`). Never defaults to or renders DemoAccessPortal.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface-base text-slate-100 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">Sign In</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sign in with your email and password to access your account.
          </p>
        </div>

        <Suspense fallback={null}>
          <AccountAuthForm mode="login" />
        </Suspense>
      </div>
    </div>
  );
}
