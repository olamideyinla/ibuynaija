/**
 * POST /api/auth/seller-activate
 * Sets the SELLER_COOKIE for a buyer whose seller account has been approved.
 * Safe to call speculatively — returns 404 if no sellers record exists yet.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { BUYER_COOKIE, SELLER_COOKIE } from '@/lib/cookie';

export async function POST() {
  const store  = await cookies();
  const userId = store.get(BUYER_COOKIE)?.value ?? null;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { rows } = await pool.query(
    'SELECT id FROM sellers WHERE user_id = $1',
    [userId],
  );
  if (rows.length === 0)
    return NextResponse.json({ error: 'No seller account found' }, { status: 404 });

  const sellerId = rows[0].id as string;
  const response = NextResponse.json({ ok: true, sellerId });
  response.cookies.set(SELLER_COOKIE, sellerId, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
