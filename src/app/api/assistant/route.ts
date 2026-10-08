/**
 * AI Disaster Intelligence Assistant — API Route
 *
 * POST /api/assistant
 * Server-side execution ensuring API keys and prompts remain secure.
 *
 * Security:
 * - Never trusts `body.role`. Client cannot elevate privileges via JSON payload.
 * - Verifies cryptographic HMAC signature of `disastraaa-session` cookie for real accounts.
 * - In DEMO mode only, resolves active demo persona cookie for drill simulations.
 * - Enforces strict role-based authorization, sanitization, and bounded inputs.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { assistantEngine } from '@/lib/ai/engine';
import type { AssistantQueryRequest } from '@/lib/ai/types';
import { resolveServerEnvironment } from '@/lib/env';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session';
import { parseRoleFromCookie, ROLE_COOKIE_NAME } from '@/lib/auth/roles';
import { ROLES, type Role } from '@/types/roles';

export async function POST(req: Request) {
  try {
    let body: AssistantQueryRequest;
    try {
      body = (await req.json()) as AssistantQueryRequest;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 },
      );
    }

    if (!body || typeof body.question !== 'string' || !body.question.trim()) {
      return NextResponse.json(
        { error: 'Question text is required.' },
        { status: 400 },
      );
    }

    const trimmedQuestion = body.question.trim();
    if (trimmedQuestion.length > 500) {
      return NextResponse.json(
        { error: 'Question exceeds maximum character length of 500.' },
        { status: 400 },
      );
    }

    if (body.locationFocus && (typeof body.locationFocus !== 'string' || body.locationFocus.length > 100)) {
      return NextResponse.json(
        { error: 'Location focus must be a string of at most 100 characters.' },
        { status: 400 },
      );
    }

    const serverEnv = await resolveServerEnvironment();
    const cookieStore = await cookies();

    // ── STRICT SERVER-SIDE ROLE RESOLUTION ─────────────────────────────────
    // SECURITY: Discard `body.role`. Roles claimed in the request body are untrusted.
    let verifiedRole: Role = ROLES.CITIZEN;
    let isAuthenticatedRealUser = false;

    // 1. Inspect cryptographically verified session token (disastraaa-session)
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (sessionCookie) {
      const sessionPayload = await verifySessionToken(sessionCookie);
      if (sessionPayload && sessionPayload.role) {
        verifiedRole = sessionPayload.role;
        isAuthenticatedRealUser = true;
      }
    }

    // 2. In DEMO mode only, permit demo persona cookie for simulation drills
    if (!isAuthenticatedRealUser && serverEnv === 'DEMO') {
      const demoRoleCookie = cookieStore.get(ROLE_COOKIE_NAME)?.value;
      if (demoRoleCookie) {
        verifiedRole = parseRoleFromCookie(`${ROLE_COOKIE_NAME}=${demoRoleCookie}`);
      }
    }

    // Safe live overrides strictly bound to server environment
    const liveOverrides: Partial<import('@/lib/realtime/types').LiveDataOverrides> = {
      ...(body.liveOverrides || {}),
      environment: serverEnv,
    };

    const payload = await assistantEngine.processQuery({
      question: trimmedQuestion,
      locationFocus: body.locationFocus ? body.locationFocus.trim() : undefined,
      liveOverrides,
      secondsSinceSync: body.secondsSinceSync,
      role: verifiedRole,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('Assistant API error:', error);
    return NextResponse.json(
      {
        error:
          'Operational intelligence service temporarily unable to analyze query. Please try again or inspect active operational panels directly.',
      },
      { status: 500 },
    );
  }
}
