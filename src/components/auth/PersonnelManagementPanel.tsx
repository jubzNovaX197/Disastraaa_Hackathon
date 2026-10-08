'use client';

/**
 * PersonnelManagementPanel
 *
 * Operational UI for higher-level authorities to authorize and invite personnel
 * according to the strict RBAC hierarchy.
 *
 *   SUPER_ADMIN        → National, State, District, Field
 *   NATIONAL_AUTHORITY → National, State, District, Field
 *   STATE_AUTHORITY    → District, Field
 *   DISTRICT_AUTHORITY → Field
 *   FIELD_OPERATOR     → (none)
 *
 * Lower authorities can NEVER authorize higher authorities.
 * Roles, scopes, and departments are locked to the inviter's jurisdiction
 * server-side.
 */

import { useState, useEffect, type FormEvent } from 'react';
import {
  UserPlus,
  ShieldCheck,
  Mail,
  Building,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  X,
  Users,
} from 'lucide-react';
import { ROLES, type Role } from '@/types/roles';
import { getInvitableRoles, getScopeConstraint, type ScopeConstraint } from '@/lib/auth/inviteMatrix';
import type { AuthorityInvitation, RegistrableAuthorityType } from '@/lib/auth/authorityRegistry';
import { cn } from '@/lib/utils';

interface CurrentUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  authorityId?: string;
  department?: string;
  geographicScope?: string;
  state?: string;
  district?: string;
}

export function PersonnelManagementPanel() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [invitations, setInvitations] = useState<AuthorityInvitation[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Invite modal / drawer
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [assignedRole, setAssignedRole] = useState<RegistrableAuthorityType>(ROLES.FIELD_OPERATOR);
  const [stateVal, setStateVal] = useState('');
  const [districtVal, setDistrictVal] = useState('');
  const [geographicScope, setGeographicScope] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    authorityId: string;
    email: string;
    message: string;
  } | null>(null);

  const [copiedId, setCopiedId] = useState(false);

  // Load current authenticated user
  const loadUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        const allowed = getInvitableRoles(data.user.role);
        if (allowed.length > 0) {
          setAssignedRole(allowed[0]);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingUser(false);
    }
  };

  // Load invitations
  const loadInvitations = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/auth/invite-personnel');
      const data = await res.json();
      if (data.success && Array.isArray(data.invitations)) {
        setInvitations(data.invitations);
      }
    } catch {
      // ignore
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadUser();
    void loadInvitations();
  }, []);

  const invitableRoles = user ? getInvitableRoles(user.role) : [];
  const scopeConstraint: ScopeConstraint | null = user
    ? getScopeConstraint(user.role, user.state, user.district)
    : null;

  const handleOpenModal = () => {
    setFormError(null);
    setSuccessResult(null);
    setEmail('');
    setDepartment(user?.department ?? 'Disaster Management Division');
    if (invitableRoles.length > 0) {
      setAssignedRole(invitableRoles[0]);
    }
    setStateVal(scopeConstraint?.lockState ?? user?.state ?? 'Odisha');
    setDistrictVal(scopeConstraint?.lockDistrict ?? user?.district ?? '');
    setGeographicScope(user?.geographicScope ?? '');
    setShowInviteModal(true);
  };

  const handleCopyAuthorityId = (id: string) => {
    void navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSubmitInvite = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) {
      setFormError('Official email is required.');
      return;
    }
    if (!department.trim()) {
      setFormError('Department name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/invite-personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officialEmail: email.trim(),
          assignedRole,
          department: department.trim(),
          state: stateVal.trim() || undefined,
          district: districtVal.trim() || undefined,
          geographicScope: geographicScope.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setFormError(data?.error ?? 'Failed to authorize personnel.');
        setSubmitting(false);
        return;
      }

      setSuccessResult({
        authorityId: data.invitation.authorityId,
        email: data.invitation.officialEmail,
        message: data.message,
      });
      void loadInvitations();
    } catch {
      setFormError('Network error while creating authority authorization.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || invitableRoles.length === 0) {
    return (
      <div className="bg-surface-card border border-white/[0.08] rounded-2xl p-6 text-center space-y-3">
        <ShieldCheck className="w-10 h-10 text-slate-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-100">Personnel Management Privileges Required</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Your current account role does not have authorization to issue authority invitations.
          Only Super Admins, National, State, and District operational commanders may invite personnel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card border border-white/[0.08] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Authority Personnel Management</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20 uppercase">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Authorize official employees. Assigned roles and geographic scopes are enforced server-side.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadInvitations}
            disabled={loadingList}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={cn('w-4 h-4', loadingList && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-accent to-cyan-400 text-slate-950 hover:brightness-110 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Personnel</span>
          </button>
        </div>
      </div>

      {/* Invitations Table / List */}
      <div className="bg-surface-card border border-white/[0.08] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Authority Authorizations & Invitations
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-slate-300">
              {invitations.length}
            </span>
          </div>
        </div>

        {invitations.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No personnel authorization records issued yet.</p>
            <p className="text-[11px] text-slate-500">
              Click &quot;Invite Personnel&quot; to authorize a new employee.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/[0.06] text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Authority ID</th>
                  <th className="py-3 px-4">Official Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Jurisdiction</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-accent">
                      {inv.authorityId}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {inv.officialEmail}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-white/10 uppercase">
                        {inv.assignedRole}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {inv.department}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {inv.geographicScope || [inv.district, inv.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                          inv.status === 'ACCEPTED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : inv.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
                        )}
                      >
                        {inv.status === 'ACCEPTED' && <CheckCircle2 className="w-3 h-3" />}
                        {inv.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleCopyAuthorityId(inv.authorityId)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                        title="Copy Authority ID for activation"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy ID</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Invite / Authorize Personnel */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-card border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-accent" />
                <h3 className="text-base font-bold text-white">Authorize New Personnel</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {successResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Personnel Authorization Created Successfully</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Authority record generated for <strong>{successResult.email}</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-elevated/70 border border-white/10 space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                    Issued Authority ID
                  </span>
                  <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-white/10">
                    <span className="font-mono text-base font-bold text-cyan-300 tracking-wider">
                      {successResult.authorityId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyAuthorityId(successResult.authorityId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent text-slate-950 hover:brightness-110 transition-all"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                    The employee can now visit <code className="text-accent">/register</code>, select
                    <strong> Authority Account</strong>, and enter this Authority ID along with their official email to set their password and activate their account.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setSuccessResult(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitInvite} className="space-y-4" noValidate>
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Official Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@department.gov.demo"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Assigned Authority Role *
                    </label>
                    <select
                      value={assignedRole}
                      onChange={(e) => setAssignedRole(e.target.value as RegistrableAuthorityType)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {invitableRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Department Name *
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. DEOC Tactical Response"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      State / Province
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={stateVal}
                        onChange={(e) => setStateVal(e.target.value)}
                        disabled={Boolean(scopeConstraint?.lockState)}
                        placeholder="State"
                        className={cn(
                          'w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent',
                          scopeConstraint?.lockState && 'opacity-60 cursor-not-allowed',
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      District (where applicable)
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={districtVal}
                        onChange={(e) => setDistrictVal(e.target.value)}
                        disabled={Boolean(scopeConstraint?.lockDistrict)}
                        placeholder="District"
                        className={cn(
                          'w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent',
                          scopeConstraint?.lockDistrict && 'opacity-60 cursor-not-allowed',
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Geographic Scope Description
                  </label>
                  <input
                    type="text"
                    value={geographicScope}
                    onChange={(e) => setGeographicScope(e.target.value)}
                    placeholder="e.g. Bargarh District, Coastal Response Sector"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Server-Side Security Policy</p>
                  <p className="text-slate-500 leading-relaxed">
                    The employee cannot change role, department, or geographic scope during account activation. All attributes are locked directly from this record.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-accent to-cyan-400 text-slate-950 hover:brightness-110 shadow-sm transition-all disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Authorizing...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Issue Authorization</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
