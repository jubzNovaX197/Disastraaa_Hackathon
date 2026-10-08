'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import { ROLES, type Role } from '@/types/roles';
import { AuthorityRoleSwitcher } from './AuthorityRoleSwitcher';

interface AuthorityAccessGateProps {
  currentRole: Role;
  onClearanceGranted?: (newRole: Role) => void;
}

export function AuthorityAccessGate({ currentRole, onClearanceGranted }: AuthorityAccessGateProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-xl w-full border-amber-500/30 bg-surface-card/95 backdrop-blur-xl shadow-2xl">
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <Badge severity="HIGH" dot className="mb-2">
              Operational Clearance Required
            </Badge>
            <CardTitle className="text-xl font-bold text-slate-100">
              Authority Command Center Restricted
            </CardTitle>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The Emergency Operations Command Center provides tactical decision-support,
              resource allocation telemetry, and emergency operations intelligence intended solely for
              authorized State Disaster Management Authorities (OSDMA), District Collectors, and NDRF responders.
            </p>
          </div>

          <div className="bg-surface-elevated/70 border border-white/[0.06] rounded-xl p-4 text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Session Role:</span>
              <span className="font-mono font-bold text-amber-400 uppercase">{currentRole}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Operations Clearance:</span>
              <span className="text-critical font-bold">DENIED (CITIZEN ACCESS)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Access Policy:</span>
              <span className="text-slate-400">Server-side rolePermissions[role].canViewOperations</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.06] space-y-3">
            <p className="text-xs text-slate-400">
              Evaluating platform operations? Assume an authorized responder role below to proceed:
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href="/demo"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-accent text-slate-950 hover:bg-accent/90 transition-all shadow-sm"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Select Demo Role
              </Link>

              <AuthorityRoleSwitcher
                currentRole={currentRole}
                onRoleChange={onClearanceGranted}
                compact={false}
              />

              <Link
                href="/map"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Public Map
              </Link>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 pt-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-safe" />
            Decision-support system · Zero unauthenticated dispatch triggers
          </p>
        </div>
      </Card>
    </div>
  );
}
