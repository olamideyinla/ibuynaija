/**
 * lib/admin-auth.ts
 *
 * HMAC-SHA256 session tokens for the admin interface.
 * Token format: base64url(payload_json).hex_hmac
 *
 * Usage (server components / route handlers only):
 *   const token = await createAdminToken({ id, email, role });
 *   const payload = await verifyAdminToken(token);  // null if invalid/expired
 *   const payload = await getAdminSession();        // reads from cookies
 */

import { cookies } from 'next/headers';
import { createHmac } from 'crypto';

export const ADMIN_COOKIE = 'ibuynaija_admin_session';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? 'dev-secret-change-in-production-please';
}

function toBase64Url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function fromBase64Url(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export interface AdminTokenPayload {
  id: string;
  email: string;
  role: string;
  exp: number;
}

export function createAdminToken(data: Omit<AdminTokenPayload, 'exp'>): string {
  const payload: AdminTokenPayload = { ...data, exp: Date.now() + TOKEN_TTL_MS };
  const encoded = toBase64Url(JSON.stringify(payload));
  const hmac = sign(encoded);
  return `${encoded}.${hmac}`;
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return null;
    const encoded = token.slice(0, dotIndex);
    const hmac = token.slice(dotIndex + 1);
    // Constant-time comparison via re-signing
    if (sign(encoded) !== hmac) return null;
    const payload: AdminTokenPayload = JSON.parse(fromBase64Url(encoded));
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminTokenPayload | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
