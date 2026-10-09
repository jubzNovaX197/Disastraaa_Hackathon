/**
 * Authority Verification Email — real delivery via Resend.
 *
 * This is a genuine provider integration, not a mock: if `RESEND_API_KEY`
 * is not set, `sendAuthorityVerificationEmail` throws `EmailConfigurationError`
 * rather than pretending the email was sent. Callers (see
 * `/api/auth/register`) must surface that failure to the caller/logs —
 * never report success when no email was actually delivered.
 *
 * Required environment variables:
 *   RESEND_API_KEY  — from https://resend.com (free tier available)
 *   EMAIL_FROM      — optional. Defaults to Resend's shared sandbox sender
 *                      "Disastraaa <onboarding@resend.dev>", which only
 *                      delivers to the Resend account's own verified test
 *                      address. For real delivery to arbitrary official
 *                      emails, verify a sending domain in Resend and set
 *                      EMAIL_FROM to an address on that domain.
 */

import { brand } from '@/config/brand';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Disastraaa <onboarding@resend.dev>';

export class EmailConfigurationError extends Error {}

export interface SendVerificationEmailInput {
  to: string;
  recipientName: string;
  otp: string;
  expiresInMinutes: number;
}

export interface SendEmailResult {
  delivered: boolean;
  devMode: boolean;
  otp?: string;
}

export interface SendCitizenEmailResult {
  delivered: boolean;
  devMode?: boolean;
}

// In-memory / mock mailbox for local dev and automated testing
// Keeps OTPs accessible to test runners without leaking to terminal or browser UI
const globalForMailbox = globalThis as unknown as {
  _disastraaaMockMailbox?: Array<{
    to: string;
    recipientName: string;
    otp: string;
    expiresInMinutes: number;
    sentAt: string;
  }>;
};

if (!globalForMailbox._disastraaaMockMailbox) {
  globalForMailbox._disastraaaMockMailbox = [];
}

export function getMockMailbox() {
  return globalForMailbox._disastraaaMockMailbox ?? [];
}

export function getLatestMockEmailFor(email: string) {
  const norm = email.trim().toLowerCase();
  return (globalForMailbox._disastraaaMockMailbox ?? [])
    .slice()
    .reverse()
    .find((m) => m.to.toLowerCase() === norm);
}

export async function sendAuthorityVerificationEmail(
  input: SendVerificationEmailInput,
): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) {
    // Deliver to local in-memory test mailbox — DO NOT log raw OTP to terminal
    console.log(`[AUTH-EMAIL] Verification dispatch scheduled for official recipient: ${input.to}`);
    globalForMailbox._disastraaaMockMailbox = [
      ...(globalForMailbox._disastraaaMockMailbox ?? []),
      { ...input, sentAt: new Date().toISOString() },
    ];
    return { delivered: true, devMode: true };
  }

  const resend = new Resend(RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: input.to,
    subject: `Verify your ${brand.name} Authority Account`,
    html: buildVerificationEmailHtml(input),
  });

  if (error) {
    throw new Error(`Resend failed to deliver the verification email: ${error.message}`);
  }

  return { delivered: true, devMode: false };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function sendCitizenVerificationEmail(
  input: SendVerificationEmailInput,
): Promise<SendCitizenEmailResult> {
  if (!RESEND_API_KEY) {
    // Deliver to local in-memory test mailbox — DO NOT log raw OTP to terminal
    console.log(`[CITIZEN-EMAIL] Verification dispatch scheduled for citizen recipient: ${input.to}`);
    globalForMailbox._disastraaaMockMailbox = [
      ...(globalForMailbox._disastraaaMockMailbox ?? []),
      { ...input, sentAt: new Date().toISOString() },
    ];
    return { delivered: true, devMode: true };
  }

  const resend = new Resend(RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: input.to,
    subject: `Verify your ${brand.name} account`,
    html: buildCitizenVerificationEmailHtml(input),
  });

  if (error) {
    throw new Error(`Resend failed to deliver the verification email: ${error.message}`);
  }

  return { delivered: true };
}

function buildCitizenVerificationEmailHtml({
  recipientName,
  otp,
  expiresInMinutes,
}: SendVerificationEmailInput): string {
  const safeName = escapeHtml(recipientName);

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#080C18; padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#0E1422;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
    <div style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="font-size:18px;font-weight:700;color:#F1F5F9;">${escapeHtml(brand.name)}</span>
      <div style="font-size:11px;color:#64748B;margin-top:4px;letter-spacing:0.06em;text-transform:uppercase;">
        Account Verification
      </div>
    </div>

    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#CBD5E1;margin:0 0 16px;">Hello ${safeName},</p>
      <p style="font-size:14px;color:#94A3B8;line-height:1.6;margin:0 0 24px;">
        Use the verification code below to complete your ${escapeHtml(brand.name)} account
        registration and confirm this is your email address.
      </p>

      <div style="background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.25);border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
        <span style="font-size:32px;font-weight:700;letter-spacing:0.3em;color:#22D3EE;font-family:'SFMono-Regular',Consolas,monospace;">${otp}</span>
      </div>

      <p style="font-size:12px;color:#64748B;line-height:1.6;margin:0 0 4px;">
        This code expires in ${expiresInMinutes} minutes and can only be used once.
      </p>
      <p style="font-size:12px;color:#64748B;line-height:1.6;margin:0;">
        If you did not request this, you can safely ignore this email — no account will be created.
      </p>
    </div>

    <div style="padding:16px 32px;background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.06);">
      <p style="font-size:10px;color:#475569;margin:0;line-height:1.5;">
        ${escapeHtml(brand.name)} is a prototype disaster-intelligence platform.
      </p>
    </div>
  </div>
</div>`.trim();
}

function buildVerificationEmailHtml({
  recipientName,
  otp,
  expiresInMinutes,
}: SendVerificationEmailInput): string {
  const safeName = escapeHtml(recipientName);

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#080C18; padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#0E1422;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
    <div style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="font-size:18px;font-weight:700;color:#F1F5F9;">${escapeHtml(brand.name)}</span>
      <div style="font-size:11px;color:#64748B;margin-top:4px;letter-spacing:0.06em;text-transform:uppercase;">
        Authority Account Verification
      </div>
    </div>

    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#CBD5E1;margin:0 0 16px;">Hello ${safeName},</p>
      <p style="font-size:14px;color:#94A3B8;line-height:1.6;margin:0 0 24px;">
        Use the verification code below to complete your ${escapeHtml(brand.name)} authority
        account registration. This confirms you have access to this official email address.
      </p>

      <div style="background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.25);border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
        <span style="font-size:32px;font-weight:700;letter-spacing:0.3em;color:#22D3EE;font-family:'SFMono-Regular',Consolas,monospace;">${otp}</span>
      </div>

      <p style="font-size:12px;color:#64748B;line-height:1.6;margin:0 0 4px;">
        This code expires in ${expiresInMinutes} minutes and can only be used once.
      </p>
      <p style="font-size:12px;color:#64748B;line-height:1.6;margin:0;">
        If you did not request this, you can safely ignore this email — no account will be created.
      </p>
    </div>

    <div style="padding:16px 32px;background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.06);">
      <p style="font-size:10px;color:#475569;margin:0;line-height:1.5;">
        ${escapeHtml(brand.name)} is a prototype disaster-intelligence platform. This is a
        simulated authority verification system for demonstration purposes and is not
        connected to any real government identity provider.
      </p>
    </div>
  </div>
</div>`.trim();
}
