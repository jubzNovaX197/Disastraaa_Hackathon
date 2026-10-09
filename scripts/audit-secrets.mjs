#!/usr/bin/env node
/**
 * Secret & Credential Audit Script
 *
 * Verifies that:
 * 1. No active environment secrets files (.env.local, .env.production, etc.) are tracked in git.
 * 2. Source code does not contain hardcoded private keys or production secrets.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();

const FORBIDDEN_TRACKED_PATTERNS = [
  /^\.env\.local$/i,
  /^\.env\.production$/i,
  /^\.env\.production\.local$/i,
  /^\.env\.development\.local$/i,
  /^\.env\.test\.local$/i,
  /id_rsa/i,
  /id_ed25519/i,
  /\.pem$/i,
  /\.key$/i,
];

const SECRET_PATTERNS = [
  { name: 'RSA/EC Private Key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'OpenSSH Private Key', regex: /-----BEGIN OPENSSH PRIVATE KEY-----/ },
  { name: 'GitHub Personal Access Token', regex: /ghp_[a-zA-Z0-9]{36}/ },
  { name: 'AWS Access Key ID', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
  { name: 'Slack Bot Token', regex: /xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}/ },
];

const IGNORED_DIRS = new Set([
  '.git',
  '.next',
  'node_modules',
  'dist',
  'build',
  '.storage',
  'test-results',
  'playwright-report',
]);

const IGNORED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.pdf',
  '.tsbuildinfo',
]);

let violations = [];

// 1. Check Git-tracked files if git is available
try {
  const trackedOutput = execSync('git ls-files', { encoding: 'utf8', cwd: ROOT_DIR });
  const trackedFiles = trackedOutput.split(/\r?\n/).filter(Boolean);

  for (const file of trackedFiles) {
    const filename = path.basename(file);
    if (filename === '.env.example') continue;

    for (const pattern of FORBIDDEN_TRACKED_PATTERNS) {
      if (pattern.test(filename)) {
        violations.push({
          type: 'Forbidden Tracked File',
          file,
          detail: `File matches forbidden secret pattern: ${pattern}`,
        });
      }
    }
  }
} catch {
  // If git is not available, proceed to source scanning
}

// 2. Scan source tree for accidental hardcoded credentials
function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath);

    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IGNORED_EXTENSIONS.has(ext)) continue;
      if (relPath.includes('node_modules') || relPath.includes('.next')) continue;
      // Do not scan this audit script itself for its own regex definitions
      if (relPath.replace(/\\/g, '/') === 'scripts/audit-secrets.mjs') continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const { name, regex } of SECRET_PATTERNS) {
          if (regex.test(content)) {
            violations.push({
              type: 'Leaked Secret Pattern',
              file: relPath,
              detail: `Potential ${name} detected`,
            });
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
  }
}

try {
  walkDir(ROOT_DIR);
} catch (err) {
  console.error('[audit:secrets] Failed while scanning directories:', err);
  process.exit(1);
}

if (violations.length > 0) {
  console.error('\n❌ [audit:secrets] Secret violations detected:');
  for (const v of violations) {
    console.error(` - [${v.type}] ${v.file}: ${v.detail}`);
  }
  process.exit(1);
}

console.log('✓ [audit:secrets] Secrets audit passed. No exposed credentials found.');
process.exit(0);
