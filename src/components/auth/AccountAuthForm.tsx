'use client';

/**
 * AccountAuthForm
 *
 * Real credential Login / Register form — entirely separate from
 * DemoAccessPortal. Never touches the `disastraaa-user-role` demo cookie,
 * only the real `disastraaa-session` cookie (set server-side by the API
 * routes this form calls).
 *
 * mode="login"    → POST /api/auth/login (Official Email + Password).
 * mode="register" → two-step Authority Registration:
 *   Step 1 "form"   → POST /api/auth/register
 *                     (Authority ID + Official Email + Password + Confirm).
 *                     Does not create an account or sign in — only sends a
 *                     6-digit code to the official email.
 *   Step 2 "verify" → POST /api/auth/verify-email (6-digit code). On
 *                     success the account is created, role/department/
 *                     scope are assigned from the authority registry, and
 *                     the user is signed in immediately.
 *
 * The user never selects a role anywhere in this form — there is no role
 * field, dropdown, or hidden input. Role comes entirely from the server.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  Mail,
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  MailCheck,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountAuthFormProps {
  mode: 'login' | 'register';
}

const RESEND_COOLDOWN_SECONDS = 60;

const SEED_TEST_ACCOUNTS = [
  { role: 'L5 Super Admin', email: 'superadmin@disastraaa.gov.demo', badge: 'NDIC' },
  { role: 'L4 National', email: 'ops@ndma.gov.demo', badge: 'NDMA' },
  { role: 'L3 State', email: 'commissioner@osdma.gov.demo', badge: 'OSDMA' },
  { role: 'L2 District', email: 'collector@bargarh.nic.demo', badge: 'DEOC' },
  { role: 'L1 Field Ops', email: 'fieldops@ndrf.gov.demo', badge: 'NDRF' },
  { role: 'Citizen', email: 'citizen@example.demo', badge: 'Public' },
];

export function AccountAuthForm({ mode }: AccountAuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';
  const isRegister = mode === 'register';

  // ── Step 1 fields (shared shape; login only uses email/password) ──────────
  const [name, setName] = useState('');
  const [authorityId, setAuthorityId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Step 2 (register only): OTP verification ───────────────────────────────
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchHref = `/${isRegister ? 'login' : 'register'}${
    from !== '/dashboard' ? `?from=${encodeURIComponent(from)}` : ''
  }`;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // ── Login ────────────────────────────────────────────────────────────────

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your official email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setError(data?.error ?? 'Invalid email or password.');
        setIsSubmitting(false);
        return;
      }

      let targetUrl = from;
      if (!searchParams.get('from') && data?.user?.role) {
        const r = data.user.role;
        if (r === 'SUPER_ADMIN') targetUrl = '/governance';
        else if (r === 'NATIONAL_AUTHORITY') targetUrl = '/analytics';
        else if (r === 'FIELD_OPERATOR') targetUrl = '/operations';
        else if (r === 'REGISTERED_USER') targetUrl = '/map';
        else targetUrl = '/dashboard';
      }

      router.push(targetUrl);
      router.refresh();
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  // ── Register — step 1: submit Authority ID + email + password ──────────────

  const submitRegistration = async () => {
    setError(null);

    if (!authorityId.trim()) {
      setError('Please enter your Authority ID.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your official email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorityId: authorityId.trim(),
          officialEmail: email.trim(),
          password,
          confirmPassword,
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setError(data?.error ?? 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setPendingId(data.pendingId);
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
      setNotice(data.message ?? `A verification code was sent to ${email.trim()}.`);
      setStep('verify');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setOtp('');
      setIsSubmitting(false);
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitRegistration();
  };

  const handleResend = () => {
    if (cooldown > 0 || isSubmitting) return;
    setNotice(null);
    void submitRegistration();
  };

  // ── Register — step 2: verify the 6-digit code ──────────────────────────────

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pendingId) {
      setError('Your verification session has expired. Please register again.');
      setStep('form');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingId, otp }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setError(data?.error ?? 'Verification failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      let targetUrl = from;
      if (!searchParams.get('from') && data?.user?.role) {
        const r = data.user.role;
        if (r === 'SUPER_ADMIN') targetUrl = '/governance';
        else if (r === 'NATIONAL_AUTHORITY') targetUrl = '/analytics';
        else if (r === 'FIELD_OPERATOR') targetUrl = '/operations';
        else if (r === 'REGISTERED_USER') targetUrl = '/map';
        else targetUrl = '/dashboard';
      }

      router.push(targetUrl);
      router.refresh();
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  // ── Render: Login ────────────────────────────────────────────────────────

  if (!isRegister) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          {error && <ErrorBanner message={error} />}

          <Field label="Email Address" htmlFor="auth-email">
            <IconInput
              id="auth-email"
              icon={<Mail className="w-4 h-4" />}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </Field>

          <Field label="Password" htmlFor="auth-password">
            <PasswordInput
              id="auth-password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggleShow={() => setShowPassword((v) => !v)}
              placeholder="Your account password"
              autoComplete="current-password"
            />
          </Field>

          <SubmitButton isSubmitting={isSubmitting} idleLabel="Sign In" busyLabel="Signing In..." />

          {/* Create Account section */}
          <div className="pt-2 text-center">
            <span className="text-xs text-slate-500">Don&apos;t have an account? </span>
            <Link
              href="/register"
              className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
            >
              Create Account
            </Link>
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-surface-card px-2 text-slate-400">or</span>
            </div>
          </div>

          {/* Demo simulation entry */}
          <div className="text-center space-y-1.5">
            <p className="text-xs text-slate-500">Want to explore the simulated environment?</p>
            <Link
              href="/demo"
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-center border border-amber-500/30 hover:border-amber-500/50 text-amber-500 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enter Demo</span>
            </Link>
          </div>

          {/* Collapsible Developer / Evaluator Quick Fill (Discrete, not prominent) */}
          <details className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
            <summary className="cursor-pointer text-slate-500 hover:text-slate-400 font-medium text-[11px] select-none flex items-center justify-center gap-1 py-1">
              <span>🛠️ Evaluator / Dev Quick Fill</span>
            </summary>
            <div className="mt-2 p-2.5 rounded-xl bg-slate-900/60 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Select a test account:</span>
                <span className="font-mono">Pwd: Password123!</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {SEED_TEST_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword('Password123!');
                      setError(null);
                    }}
                    className={cn(
                      'px-2 py-1 rounded-lg text-left text-[11px] font-medium transition-all border flex flex-col justify-center',
                      email === acc.email
                        ? 'bg-accent/20 border-accent/50 text-cyan-600 dark:text-accent font-semibold'
                        : 'bg-white/60 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.08] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300',
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate font-semibold text-[10px]">{acc.role}</span>
                      <span className="text-[8px] px-1 rounded bg-slate-200 dark:bg-white/10 text-slate-500 font-mono">{acc.badge}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 truncate">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </details>
        </form>
      </div>
    );
  }

  // ── Render: Register — step 2 (verify code) ─────────────────────────────────

  if (step === 'verify') {
    return (
      <div className="w-full max-w-sm mx-auto">
        <form onSubmit={handleVerify} className="space-y-4" noValidate>
          {notice && (
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/25 text-accent text-xs flex items-start gap-2.5 animate-fade-in">
              <MailCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}
          {devOtp && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between gap-2 animate-fade-in">
              <span>Development Code: <code className="font-mono font-bold text-white tracking-widest">{devOtp}</code></span>
              <button
                type="button"
                onClick={() => setOtp(devOtp)}
                className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[11px] font-semibold text-emerald-300 transition-colors"
              >
                Auto-fill
              </button>
            </div>
          )}
          {error && <ErrorBanner message={error} />}

          <Field label="6-Digit Verification Code" htmlFor="auth-otp">
            <IconInput
              id="auth-otp"
              icon={<KeyRound className="w-4 h-4" />}
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              className="tracking-[0.5em] text-center font-mono"
            />
          </Field>

          <SubmitButton isSubmitting={isSubmitting} idleLabel="Verify & Create Account" busyLabel="Verifying..." />

          <div className="flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setError(null);
                setNotice(null);
              }}
              className="hover:text-slate-300 transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isSubmitting}
              className={cn(
                'hover:text-slate-300 transition-colors',
                (cooldown > 0 || isSubmitting) && 'opacity-50 cursor-not-allowed hover:text-slate-500',
              )}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Render: Register — step 1 (Authority ID + official email + password) ──

  return (
    <div className="w-full max-w-sm mx-auto">
      <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
        {error && <ErrorBanner message={error} />}

        <Field label="Authority ID" htmlFor="auth-authority-id">
          <IconInput
            id="auth-authority-id"
            icon={<ShieldCheck className="w-4 h-4" />}
            type="text"
            value={authorityId}
            onChange={setAuthorityId}
            placeholder="e.g. OD-DST-2301"
            autoComplete="off"
            className="uppercase placeholder:normal-case"
          />
          <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
            Issued to your department by the authority registry. Your role, department
            and geographic scope are assigned automatically — not selected here.
          </p>
        </Field>

        <Field label="Official Email" htmlFor="auth-email">
          <IconInput
            id="auth-email"
            icon={<Mail className="w-4 h-4" />}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@department.gov"
            autoComplete="email"
          />
        </Field>

        <Field label="Full Name (optional)" htmlFor="auth-name">
          <IconInput
            id="auth-name"
            icon={<User className="w-4 h-4" />}
            type="text"
            value={name}
            onChange={setName}
            placeholder="Defaults to your authority's registered name"
            autoComplete="name"
          />
        </Field>

        <Field label="Password" htmlFor="auth-password">
          <PasswordInput
            id="auth-password"
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggleShow={() => setShowPassword((v) => !v)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </Field>

        <Field label="Confirm Password" htmlFor="auth-confirm-password">
          <PasswordInput
            id="auth-confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showPassword}
            onToggleShow={() => setShowPassword((v) => !v)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />
        </Field>

        <SubmitButton isSubmitting={isSubmitting} idleLabel="Send Verification Code" busyLabel="Verifying Authority..." />

        <p className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href={switchHref} className="text-accent hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

// ── Small shared presentational pieces ────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-fade-in">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function IconInput({
  id,
  icon,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
  className,
}: {
  id: string;
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'numeric' | 'text';
  className?: string;
}) {
  return (
    <div className="relative">
      <span className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {icon}
      </span>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(
          'w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10',
          'focus:outline-none focus:ring-1 focus:ring-accent text-sm text-slate-100 placeholder:text-slate-600',
          className,
        )}
      />
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 focus:outline-none focus:ring-1 focus:ring-accent text-sm text-slate-100 placeholder:text-slate-600"
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function SubmitButton({
  isSubmitting,
  idleLabel,
  busyLabel,
}: {
  isSubmitting: boolean;
  idleLabel: string;
  busyLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className={cn(
        'w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
        'bg-gradient-to-r from-accent to-cyan-400 text-slate-950 hover:brightness-110 shadow-sm',
        'disabled:opacity-60 disabled:cursor-not-allowed',
      )}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{busyLabel}</span>
        </>
      ) : (
        <>
          <span>{idleLabel}</span>
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
}
