'use client';

/**
 * GovernanceDashboard
 *
 * Platform Governance, Security Policies & Audit Trail Center.
 * Dedicated workspace for SUPER_ADMIN (Level 5 Clearance).
 */

import { PersonnelManagementPanel } from '@/components/auth/PersonnelManagementPanel';
import { Badge, Card, CardTitle } from '@/components/ui';
import {
  DEMO_ROLES_CONFIG,
  ROLE_COOKIE_NAME,
  getDemoUserContext,
  isAuthorizedForGovernance,
} from '@/lib/auth/roles';
import { cn } from '@/lib/utils';
import { ROLES, type Role } from '@/types/roles';
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Database,
  FileCheck2,
  KeyRound,
  Lock,
  RefreshCw,
  Server,
  ShieldAlert,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface GovernanceDashboardProps {
  initialRole?: Role;
}

export function GovernanceDashboard({ initialRole = ROLES.SUPER_ADMIN }: GovernanceDashboardProps) {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<Role>(initialRole);
  const [activeTab, setActiveTab] = useState<'rbac' | 'personnel' | 'audit' | 'diagnostics'>('rbac');

  const isSuperAdmin = isAuthorizedForGovernance(currentRole);

  const handleElevateToSuperAdmin = () => {
    document.cookie = `${ROLE_COOKIE_NAME}=${encodeURIComponent(ROLES.SUPER_ADMIN)}; path=/; max-age=604800; SameSite=Lax`;
    try {
      localStorage.setItem('disastraaa-demo-role', ROLES.SUPER_ADMIN);
    } catch {
      // ignore
    }
    setCurrentRole(ROLES.SUPER_ADMIN);
    router.refresh();
  };

  const handleAssumeRole = (role: Role, targetRoute: string) => {
    document.cookie = `${ROLE_COOKIE_NAME}=${encodeURIComponent(role)}; path=/; max-age=604800; SameSite=Lax`;
    try {
      localStorage.setItem('disastraaa-demo-role', role);
    } catch {
      // ignore
    }
    router.push(targetRoute);
    router.refresh();
  };

  // If user does not have Super Admin clearance, render clearance gate
  if (!isSuperAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-xl w-full border-rose-500/30 bg-surface-card/95 backdrop-blur-xl shadow-2xl">
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <Badge severity="CRITICAL" dot className="mb-2">
                Level 5 Clearance Required
              </Badge>
              <CardTitle className="text-xl font-bold text-white">
                Platform Governance & Audit Restricted
              </CardTitle>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Platform Governance, role provisioning, and cryptographic security audit trails are restricted to Chief Information Security Officers and National Informatics Core (NDIC) administrators.
              </p>
            </div>

            <div className="bg-surface-elevated/70 border border-white/[0.06] rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Session Role:</span>
                <span className="font-mono font-bold text-amber-400 uppercase">{currentRole}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Clearance Level:</span>
                <span className="text-rose-400 font-bold">INSUFFICIENT (REQUIRES LEVEL 5)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06] space-y-3">
              <p className="text-xs text-slate-400">
                Evaluating platform governance? You can assume the Super Admin persona to inspect system access:
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleElevateToSuperAdmin}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Assume Super Admin Role
                </button>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                >
                  Return to Command Center
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const superAdminContext = getDemoUserContext(ROLES.SUPER_ADMIN);

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] w-full mx-auto space-y-6">
      {/* Governance Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-card border border-white/[0.08] rounded-2xl p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  Platform Governance & Security Center
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Level 5 Security Clearance
                </span>
              </div>
              <p className="text-xs text-slate-400">
                National Disaster Informatics Core (NDIC) · Global RBAC Policies & Audit Trail
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-200">{superAdminContext.name}</p>
            <p className="text-[10px] text-slate-400">{superAdminContext.title}</p>
          </div>
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Switch Demo Role
          </Link>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-card border border-white/[0.06] space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Configured Authority Tiers</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white">5 Active Roles</p>
          <p className="text-[11px] text-safe flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            14 Certified Operational Personas
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-white/[0.06] space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Zero-Trust Policy</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">Enforced</p>
          <p className="text-[11px] text-slate-400">
            Strict Spatial RBAC + Cookie Verification
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-white/[0.06] space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Audit Trail Records</span>
            <FileCheck2 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">142 Events / 24h</p>
          <p className="text-[11px] text-amber-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            SHA-256 Digest Chain Verified
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-card border border-white/[0.06] space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Core Telemetry Pipeline</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">100% Operational</p>
          <p className="text-[11px] text-safe">
            MapLibre Engine · Real-time Store Synced
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('rbac')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg font-semibold transition-colors',
            activeTab === 'rbac'
              ? 'bg-accent/15 text-accent border border-accent/30'
              : 'text-slate-400 hover:text-white',
          )}
        >
          Authority Role Directory (RBAC)
        </button>
        <button
          onClick={() => setActiveTab('personnel')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg font-semibold transition-colors',
            activeTab === 'personnel'
              ? 'bg-accent/15 text-accent border border-accent/30'
              : 'text-slate-400 hover:text-white',
          )}
        >
          Personnel &amp; Invitations
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg font-semibold transition-colors',
            activeTab === 'audit'
              ? 'bg-accent/15 text-accent border border-accent/30'
              : 'text-slate-400 hover:text-white',
          )}
        >
          Live Security Audit Trail
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg font-semibold transition-colors',
            activeTab === 'diagnostics'
              ? 'bg-accent/15 text-accent border border-accent/30'
              : 'text-slate-400 hover:text-white',
          )}
        >
          System Health & Architecture
        </button>
      </div>

      {/* Tab 1: RBAC Table */}
      {activeTab === 'rbac' && (
        <div className="bg-surface-card border border-white/[0.08] rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Operational Role Clearance Registry</h2>
              <p className="text-xs text-slate-400">
                Multi-agency permission hierarchy governing intelligence visibility and dispatch authorization.
              </p>
            </div>
            <Link
              href="/demo"
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              Interactive Demo Access →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/[0.06] text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Role & Jurisdiction</th>
                  <th className="py-3 px-4">Clearance</th>
                  <th className="py-3 px-4">Designated Officer</th>
                  <th className="py-3 px-4">Operational Scope</th>
                  <th className="py-3 px-4 text-right">Demo Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {DEMO_ROLES_CONFIG.map((r) => (
                  <tr key={r.role} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{r.name}</div>
                      <div className="text-[11px] text-slate-400">{r.jurisdiction}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 border border-white/10 text-slate-300">
                        {r.clearanceLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{r.assignedOfficer}</div>
                      <div className="text-[10px] text-slate-500">{r.officerTitle}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs leading-relaxed">
                      {r.shortDesc}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleAssumeRole(r.role, r.defaultDashboard)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-colors"
                      >
                        <span>Assume</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Security Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-surface-card border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Immutable Platform Audit Trail</h2>
              <p className="text-xs text-slate-400">
                Cryptographically linked event records detailing operational decisions, dispatches, and clearances.
              </p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              INTEGRITY VERIFIED
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {[
              {
                time: 'Just now',
                event: 'GOVERNANCE_SESSION_INIT',
                actor: 'Dr. Amitav Sen (SUPER_ADMIN)',
                scope: 'NDIC Core Portal',
                hash: 'sha256:7f4a...88e1',
                status: 'VERIFIED',
              },
              {
                time: '4 mins ago',
                event: 'INCIDENT_TRIAGED',
                actor: 'Priyadarshini Sahoo, IAS (DISTRICT_AUTHORITY)',
                scope: 'INC-1008 (Severe Landslide) escalated to HIGH',
                hash: 'sha256:bc31...99d4',
                status: 'VERIFIED',
              },
              {
                time: '12 mins ago',
                event: 'REPORT_SUBMITTED_AND_LINKED',
                actor: 'CITIZEN_REPORTER (Public IP Verified)',
                scope: 'cr-102 photo evidence attached (Vythiri, Wayanad)',
                hash: 'sha256:e019...45a2',
                status: 'VERIFIED',
              },
              {
                time: '34 mins ago',
                event: 'SEOC_EVACUATION_ORDER',
                actor: 'Dr. Suresh Mohapatra (STATE_AUTHORITY)',
                scope: 'Zone 3 Coastal Corridor Evacuation Initiated',
                hash: 'sha256:aa44...81f6',
                status: 'VERIFIED',
              },
              {
                time: '1 hour ago',
                event: 'NDMA_CROSS_STATE_SYNC',
                actor: 'Col. Rajeshwar Singh (NATIONAL_AUTHORITY)',
                scope: 'Multi-hazard risk model sync between Odisha and AP',
                hash: 'sha256:91d2...00c8',
                status: 'VERIFIED',
              },
              {
                time: '2 hours ago',
                event: 'TACTICAL_UNIT_DISPATCH',
                actor: 'Cmdr. R. K. Verma (FIELD_OPERATOR)',
                scope: '3rd Battalion NDRF deployed to Blocked Road NH-316',
                hash: 'sha256:18cc...ee37',
                status: 'VERIFIED',
              },
            ].map((entry, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col md:flex-row md:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">{entry.event}</span>
                    <span className="text-[10px] text-slate-500">[{entry.time}]</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{entry.scope}</p>
                  <p className="text-[10px] text-slate-500">Actor: {entry.actor}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400">{entry.hash}</span>
                  <span className="text-[10px] text-safe font-bold bg-safe/10 px-2 py-0.5 rounded border border-safe/20">
                    {entry.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: System Health Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-surface-card border border-white/[0.08] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Application Services & Engine Health
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-slate-300">Next.js 15 App Router & API Engine</span>
                <span className="text-safe font-bold">ONLINE (HTTP 200)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-slate-300">MapLibre Geospatial Vector Pipeline</span>
                <span className="text-safe font-bold">OPTIMAL (60 FPS)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-slate-300">Incident Management Store</span>
                <span className="text-safe font-bold">PERSISTED (8 Incidents)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-slate-300">Citizen Reporting Repository</span>
                <span className="text-safe font-bold">PERSISTED (12 Reports)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-slate-300">Telemetry Stream & Live Bus</span>
                <span className="text-safe font-bold">STREAMING ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-card border border-white/[0.08] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              Security Architecture Boundaries
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              <p className="leading-relaxed">
                The Disastraaa platform implements a robust zero-trust boundary separating public citizens from operational authorities.
              </p>
              <ul className="space-y-1.5 text-[11px] text-slate-400 pt-1">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-safe flex-shrink-0 mt-0.5" />
                  <span>Public website (<code className="text-cyan-400">/map</code>, <code className="text-cyan-400">/alerts</code>, <code className="text-cyan-400">/travel</code>) remains accessible without login.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-safe flex-shrink-0 mt-0.5" />
                  <span>Operational dashboards are protected by <code className="text-cyan-400">AuthorityAccessGate</code> with simulated role elevation.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-safe flex-shrink-0 mt-0.5" />
                  <span>Submitted citizen reports bridge directly into the authority triage pipeline.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Personnel & Invitations */}
      {activeTab === 'personnel' && (
        <PersonnelManagementPanel />
      )}
    </div>
  );
}
