import { rolePermissions, type Role } from '@/types/roles';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isKnownRole } from './accessPolicy';
import { ROLE_COOKIE_NAME } from './roles';
import { SESSION_COOKIE_NAME, verifySessionToken } from './session';

/** Real writes require a signed account. Persona cookies apply only to demo incidents. */
export async function requireAuthority(allowSimulation = false): Promise<
  { actor: { name: string; role: Role }; environment: 'REAL' | 'DEMO'; error?: never } |
  { actor?: never; environment?: never; error: NextResponse }
> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (session) {
    if (!rolePermissions[session.role].canViewOperations) return { error: NextResponse.json({ error: 'Authority role required' }, { status: 403 }) };
    return { actor: { name: session.name, role: session.role }, environment: 'REAL' };
  }
  if (!token && allowSimulation && jar.get('disastraaa-env')?.value === 'DEMO') {
    const role = jar.get(ROLE_COOKIE_NAME)?.value;
    if (role && isKnownRole(role) && rolePermissions[role].canViewOperations) {
      return { actor: { name: 'Fictional demo dispatcher', role }, environment: 'DEMO' };
    }
  }
  return { error: NextResponse.json({ error: 'Signed authority session required' }, { status: 401 }) };
}
