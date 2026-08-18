/**
 * middleware.ts
 *
 * Two responsibilities:
 *
 * 1. Admin guard — protects all /admin routes (except /admin/login) by
 *    checking for a valid ibuynaija_admin_session cookie.
 *    NOTE: Next.js middleware runs on Edge Runtime (no Node.js crypto).
 *    We do a lightweight structural check here; full HMAC verification
 *    happens in each route handler via verifyAdminToken().
 *
 * 2. Referral cookie capture — when a ?ref= param is present, stores it in
 *    a 7-day httpOnly cookie so the attribution survives navigation and login.
 *
 *    Link formats:
 *      Source A  /shop/<slug>?ref=s_<seller-uuid>   (seller's share link)
 *      Source B  /register?ref=b_<user-uuid>         (buyer's generic link)
 *
 *    The cookie is consumed by the registration handler (POST /api/referrals).
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Inlined to avoid pulling lib/admin-auth (Node crypto) into the Edge Runtime.
const ADMIN_COOKIE = 'ibuynaija_admin_session';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ── 1. Referral cookie capture ───────────────────────────────────────────
  const ref = request.nextUrl.searchParams.get('ref');
  if (ref) {
    const match = ref.match(/^([sb])_(.+)$/);
    if (match && UUID_RE.test(match[2])) {
      response.cookies.set('ibuynaija_ref', ref, {
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
      });
    }
  }

  // ── 2. Admin route guard ─────────────────────────────────────────────────
  if (!pathname.startsWith('/admin')) {
    return response;
  }

  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return response;
  }

  const sessionCookie = request.cookies.get(ADMIN_COOKIE)?.value;
  const looksValid =
    typeof sessionCookie === 'string' &&
    sessionCookie.includes('.') &&
    sessionCookie.length > 40;

  if (!looksValid) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/shop/:path*', '/register', '/login'],
};
