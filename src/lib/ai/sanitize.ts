/**
 * AI Disaster Intelligence Assistant — Prompt Injection & Data Sanitization
 *
 * Enforces strict isolation of untrusted external content (citizen reports,
 * user questions, public comments). Prevents jailbreaks, role hijacking,
 * and PII leakage.
 */

// Patterns commonly used in prompt injection attacks
const INJECTION_PATTERNS = [
  /\[SYSTEM\]/gi,
  /\[\/SYSTEM\]/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
  /<\/SYS>>/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /<\|system\|>/gi,
  /<\|user\|>/gi,
  /<\|assistant\|>/gi,
  /###\s*system/gi,
  /###\s*instruction/gi,
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/gi,
  /you\s+are\s+now\s+(a|an|DAN|unrestricted)/gi,
  /system\s+override/gi,
  /developer\s+mode/gi,
  /admin\s+override/gi,
];

// Sensitive PII patterns (Indian phone numbers, email addresses)
const PHONE_PATTERN = /(\+?91[\-\s]?)?[6-9]\d{9}/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Sanitizes untrusted text by neutralizing injection markers, stripping PII,
 * removing non-printable control characters, and bounding length.
 */
export function sanitizeUntrustedText(
  input: string | undefined | null,
  maxLength = 300,
): string {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input;

  // 1. Strip sensitive PII
  sanitized = sanitized.replace(PHONE_PATTERN, '[PHONE_REDACTED]');
  sanitized = sanitized.replace(EMAIL_PATTERN, '[EMAIL_REDACTED]');

  // 2. Neutralize injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[BLOCKED_INSTRUCTION]');
  }

  // 3. Remove non-printable control characters (keep standard whitespace)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 4. Normalize excessive newlines/spaces
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // 5. Enforce max character bound
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '...';
  }

  return sanitized;
}

/**
 * Wraps operational context in inert XML-style data tags with explicit delimiters.
 */
export function wrapInertDataPayload(data: unknown, label = 'grounded_operational_data'): string {
  const jsonStr = JSON.stringify(data, null, 2);
  return `<${label} role="inert_data_only" execution_policy="untrusted">\n${jsonStr}\n</${label}>`;
}
