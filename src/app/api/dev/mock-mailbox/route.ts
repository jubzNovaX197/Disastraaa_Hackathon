import { getLatestMockEmailFor } from '@/lib/email/sendVerificationEmail';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email query parameter required' }, { status: 400 });
  }

  const item = getLatestMockEmailFor(email);
  if (!item) {
    return NextResponse.json({ error: 'No mock email found for recipient' }, { status: 404 });
  }

  return NextResponse.json({ success: true, otp: item.otp, to: item.to });
}
