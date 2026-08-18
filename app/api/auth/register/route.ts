import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { BUYER_COOKIE } from '@/lib/cookie';

export async function POST(request: Request) {
  let body: { email?: string; password?: string; full_name?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, password, full_name } = body;

  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  // Check for existing account
  const { rows: existing } = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [normalizedEmail],
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Read referral cookie before inserting
  const store = await cookies();
  const refCookie = store.get('ibuynaija_ref')?.value ?? null;

  const { rows: [user] } = await pool.query(
    `INSERT INTO users (email, full_name, password_hash, is_buyer)
     VALUES ($1, $2, $3, true)
     RETURNING id`,
    [normalizedEmail, full_name?.trim() || null, passwordHash],
  );
  const userId: string = user.id;

  // Source A referral: seller's link brought this new buyer in
  if (refCookie?.startsWith('s_')) {
    const sellerId = refCookie.slice(2);
    try {
      const { rows: [sellerRow] } = await pool.query(
        'SELECT id FROM sellers WHERE id = $1',
        [sellerId],
      );
      if (sellerRow) {
        await pool.query(
          `UPDATE users
           SET referred_by_seller_id = $1, referral_source = 'A'
           WHERE id = $2`,
          [sellerId, userId],
        );
        await pool.query(
          `INSERT INTO referrals
             (referrer_id, referrer_type, referred_id, referred_type, source, status)
           VALUES ($1, 'seller', $2, 'buyer', 'A', 'pending')
           ON CONFLICT DO NOTHING`,
          [sellerId, userId],
        );
      }
    } catch {
      // Non-critical — don't block registration
    }
  }

  const response = NextResponse.json({ id: userId }, { status: 201 });
  response.cookies.set(BUYER_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}
