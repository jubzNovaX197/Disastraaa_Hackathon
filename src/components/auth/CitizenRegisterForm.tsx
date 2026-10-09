'use client';

/**
 * CitizenRegisterForm
 *
 * Real public/citizen account registration — entirely separate from
 * Authority registration (AccountAuthForm) and Demo Access. Two-step flow:
 *   Step 1 "form"   → POST /api/auth/register-citizen (profile + password).
 *                     Sends a 6-digit code to the given email. Does not
 *                     create an account or sign in.
 *   Step 2 "verify" → POST /api/auth/verify-citizen-email (6-digit code).
 *                     On success the account is created with the baseline
 *                     REGISTERED_USER role and the user is signed in.
 *
 * Location is only ever collected via an explicit "Allow location access"
 * button that calls the browser Geolocation API — never automatically on
 * mount. The user can skip it and registration still proceeds.
 */

import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye, EyeOff,
  Home as HomeIcon,
  KeyRound,
  Loader2,
  LocateFixed,
  Lock,
  Mail,
  MailCheck,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

const RESEND_COOLDOWN_SECONDS = 60;

type LocationState = 'idle' | 'requesting' | 'granted' | 'denied';

export function CitizenRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/map';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleRequestLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationState('denied');
      return;
    }
    setLocationState('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationState('granted');
      },
      () => {
        setLocationState('denied');
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  // ── Step 1: submit profile + password ─────────────────────────────────────

  const submitRegistration = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
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
      const res = await fetch('/api/auth/register-citizen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          state: state.trim() || undefined,
          district: district.trim() || undefined,
          latitude: coords?.lat,
          longitude: coords?.lng,
          password,
          confirmPassword,
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

  // ── Step 2: verify the 6-digit code ─────────────────────────────────────────

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
      const res = await fetch('/api/auth/verify-citizen-email', {
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

      const destination = from === '/dashboard' ? '/map' : from;
      router.push(destination);
      router.refresh();
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  // ── Render: Step 2 (verify code) ────────────────────────────────────────────

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

          <Field label="6-Digit Verification Code" htmlFor="citizen-otp">
            <IconInput
              id="citizen-otp"
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
              onClick={() => { setStep('form'); setError(null); setNotice(null); }}
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

  // ── Render: Step 1 (profile form) ───────────────────────────────────────────

  return (
    <div className="w-full max-w-sm mx-auto">
      <form onSubmit={handleRegisterSubmit} className="space-y-4" noValidate>
        {error && <ErrorBanner message={error} />}

        <Field label="Full Name" htmlFor="citizen-name">
          <IconInput id="citizen-name" icon={<User className="w-4 h-4" />} type="text"
            value={name} onChange={setName} placeholder="Your full name" autoComplete="name" />
        </Field>

        <Field label="Email" htmlFor="citizen-email">
          <IconInput id="citizen-email" icon={<Mail className="w-4 h-4" />} type="email"
            value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
        </Field>

        <Field label="Phone Number (optional)" htmlFor="citizen-phone">
          <IconInput id="citizen-phone" icon={<Phone className="w-4 h-4" />} type="tel"
            value={phone} onChange={setPhone} placeholder="+91 90000 00000" autoComplete="tel" />
        </Field>

        <Field label="Address (optional)" htmlFor="citizen-address">
          <IconInput id="citizen-address" icon={<HomeIcon className="w-4 h-4" />} type="text"
            value={address} onChange={setAddress} placeholder="Street, locality" autoComplete="street-address" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="State (optional)" htmlFor="citizen-state">
            <IconInput id="citizen-state" icon={<MapPin className="w-4 h-4" />} type="text"
              value={state} onChange={setState} placeholder="Odisha" autoComplete="address-level1" />
          </Field>
          <Field label="District (optional)" htmlFor="citizen-district">
            <IconInput id="citizen-district" icon={<MapPin className="w-4 h-4" />} type="text"
              value={district} onChange={setDistrict} placeholder="Khordha" autoComplete="address-level2" />
          </Field>
        </div>

        {/* Location consent */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Allow location access to improve local disaster alerts and nearby safety information.
            This is optional — you can register without it.
          </p>
          {locationState === 'granted' ? (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-safe">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Location captured
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRequestLocation}
              disabled={locationState === 'requesting'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors disabled:opacity-60"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              {locationState === 'requesting' ? 'Requesting...' : locationState === 'denied' ? 'Location unavailable — continue without it' : 'Allow location access'}
            </button>
          )}
        </div>

        <Field label="Password" htmlFor="citizen-password">
          <PasswordInput id="citizen-password" value={password} onChange={setPassword}
            show={showPassword} onToggleShow={() => setShowPassword((v) => !v)}
            placeholder="At least 8 characters" autoComplete="new-password" />
        </Field>

        <Field label="Confirm Password" htmlFor="citizen-confirm-password">
          <PasswordInput id="citizen-confirm-password" value={confirmPassword} onChange={setConfirmPassword}
            show={showPassword} onToggleShow={() => setShowPassword((v) => !v)}
            placeholder="Re-enter your password" autoComplete="new-password" />
        </Field>

        <SubmitButton isSubmitting={isSubmitting} idleLabel="Send Verification Code" busyLabel="Submitting..." />
      </form>
    </div>
  );
}

// ── Shared presentational pieces (mirrors AccountAuthForm's) ─────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-fade-in">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function IconInput({
  id, icon, type, value, onChange, placeholder, autoComplete, inputMode, className,
}: {
  id: string; icon: React.ReactNode; type: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string; inputMode?: 'numeric' | 'text'; className?: string;
}) {
  return (
    <div className="relative">
      <span className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</span>
      <input
        id={id} type={type} inputMode={inputMode} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
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
  id, value, onChange, show, onToggleShow, placeholder, autoComplete,
}: {
  id: string; value: string; onChange: (v: string) => void; show: boolean;
  onToggleShow: () => void; placeholder?: string; autoComplete?: string;
}) {
  return (
    <div className="relative">
      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        id={id} type={show ? 'text' : 'password'} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
        className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 focus:outline-none focus:ring-1 focus:ring-accent text-sm text-slate-100 placeholder:text-slate-600"
      />
      <button type="button" onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
        tabIndex={-1} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function SubmitButton({ isSubmitting, idleLabel, busyLabel }: { isSubmitting: boolean; idleLabel: string; busyLabel: string }) {
  return (
    <button type="submit" disabled={isSubmitting}
      className={cn(
        'w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all',
        'bg-gradient-to-r from-accent to-cyan-400 text-slate-950 hover:brightness-110 shadow-sm',
        'disabled:opacity-60 disabled:cursor-not-allowed',
      )}>
      {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>{busyLabel}</span></>)
        : (<><span>{idleLabel}</span><ArrowRight className="w-4 h-4" /></>)}
    </button>
  );
}
