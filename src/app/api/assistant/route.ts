/**
 * AI Disaster Intelligence Assistant — API Route
 *
 * POST /api/assistant
 * Server-side execution ensuring API keys and prompts remain secure.
 */

import { NextResponse } from 'next/server';
import { assistantEngine } from '@/lib/ai/engine';
import type { AssistantQueryRequest } from '@/lib/ai/types';

import { resolveServerEnvironment } from '@/lib/env';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AssistantQueryRequest;

    if (!body || typeof body.question !== 'string' || !body.question.trim()) {
      return NextResponse.json(
        { error: 'Question text is required.' },
        { status: 400 },
      );
    }

    if (body.question.length > 500) {
      return NextResponse.json(
        { error: 'Question exceeds maximum character length of 500.' },
        { status: 400 },
      );
    }

    const serverEnv = await resolveServerEnvironment();
    const liveOverrides: Partial<import('@/lib/realtime/types').LiveDataOverrides> = {
      ...(body.liveOverrides || {}),
      environment: body.liveOverrides?.environment || serverEnv,
    };

    const payload = await assistantEngine.processQuery({
      question: body.question.trim(),
      locationFocus: body.locationFocus,
      liveOverrides,
      secondsSinceSync: body.secondsSinceSync,
      role: body.role,
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
