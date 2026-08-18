import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { BUYER_COOKIE, SELLER_COOKIE } from '@/lib/cookie';

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, password } = body;

  if (!email?.trim() || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { rows } = await pool.query<{
    id: string;
    password_hash: string | null;
    seller_id: string | null;
  }>(
    `SELECT u.id, u.password_hash,
            (SELECT id FROM sellers WHERE user_id = u.id LIMIT 1) AS seller_id
     FROM users u
     WHERE u.email = $1
     LIMIT 1`,
    [normalizedEmail],
  );

  // Deliberate generic message to avoid user enumeration
  if (rows.length === 0 || !rows[0].password_hash) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash!);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const redirectTo = user.seller_id ? '/dashboard' : '/';

  const response = NextResponse.json({
    id: user.id,
    seller_id: user.seller_id ?? null,
    redirect: redirectTo,
  });

  response.cookies.set(BUYER_COOKIE, user.id, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  if (user.seller_id) {
    response.cookies.set(SELLER_COOKIE, user.seller_id, {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}
