import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';
import bcrypt from 'bcryptjs';

// PATCH /api/admin/settings/password — change the logged-in admin's password
export async function PATCH(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { current_password?: string; new_password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { current_password, new_password } = body;
  if (!current_password || !new_password) {
    return NextResponse.json({ error: 'current_password and new_password are required' }, { status: 400 });
  }
  if (new_password.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
  }
  if (current_password === new_password) {
    return NextResponse.json({ error: 'New password must differ from the current password' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT password_hash FROM admin_users WHERE id = $1`,
    [session.id],
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
  }

  const match = await bcrypt.compare(current_password, rows[0].password_hash);
  if (!match) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
  }

  const newHash = await bcrypt.hash(new_password, 12);
  await pool.query(`UPDATE admin_users SET password_hash = $1 WHERE id = $2`, [newHash, session.id]);

  return NextResponse.json({ ok: true });
}
