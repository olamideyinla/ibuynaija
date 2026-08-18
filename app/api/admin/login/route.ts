import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { createAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT id, email, password_hash, role FROM admin_users WHERE email = $1`,
    [email.toLowerCase().trim()],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const admin = rows[0];
  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = createAdminToken({ id: admin.id, email: admin.email, role: admin.role });

  const res = NextResponse.json({ ok: true, role: admin.role });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60, // 8 hours
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
