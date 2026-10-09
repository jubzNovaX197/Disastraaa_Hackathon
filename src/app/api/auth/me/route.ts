import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false });
  }

  const payload = await verifySessionToken(sessionToken);
  if (!payload) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      uid: payload.uid,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      authorityId: payload.authorityId,
      department: payload.department,
      geographicScope: payload.geographicScope,
    },
  });
}
