/**
 * Minimal Audit Log
 *
 * In-memory, server-process-lifetime event log — same established
 * persistence convention as the rest of the auth layer (see
 * `lib/auth/users.ts`, `lib/auth/authorityRegistry.ts`). Records the
 * security-sensitive authentication/authorization events called out in the
 * platform's security requirements: authority invitation creation and
 * acceptance, and citizen/authority account creation.
 *
 * Not a full audit subsystem (no persistence beyond process lifetime, no
 * viewer UI beyond the recent-activity list on the Personnel page) — a
 * foundation that a real deployment would back with a database table.
 */

export type AuditEventType =
  | 'AUTHORITY_INVITATION_CREATED'
  | 'AUTHORITY_ACCOUNT_ACTIVATED'
  | 'CITIZEN_ACCOUNT_CREATED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  /** uid or email of the actor who performed the action, where known. */
  actor: string;
  /** Human-readable one-line summary. */
  summary: string;
  metadata?: Record<string, string | undefined>;
  createdAt: string;
}

const globalForAudit = globalThis as unknown as {
  _disastraaaAudit?: AuditEvent[];
};

if (!globalForAudit._disastraaaAudit) {
  globalForAudit._disastraaaAudit = [];
}

const MAX_EVENTS = 500;

export function recordAuditEvent(
  type: AuditEventType,
  actor: string,
  summary: string,
  metadata?: Record<string, string | undefined>,
): void {
  const event: AuditEvent = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    actor,
    summary,
    metadata,
    createdAt: new Date().toISOString(),
  };
  const list = globalForAudit._disastraaaAudit ?? [];
  const next = [event, ...list].slice(0, MAX_EVENTS);
  globalForAudit._disastraaaAudit = next;
}

/** Most recent events first, optionally filtered by type. */
export function listAuditEvents(type?: AuditEventType, limit = 50): AuditEvent[] {
  const list = globalForAudit._disastraaaAudit ?? [];
  const filtered = type ? list.filter((e) => e.type === type) : list;
  return filtered.slice(0, limit);
}
