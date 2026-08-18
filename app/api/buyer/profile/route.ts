/**
 * PATCH /api/buyer/profile
 * Update personal profile: full_name, phone, phone2.
 * Email is a login credential — not editable here.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { BUYER_COOKIE } from '@/lib/cookie';

export async function PATCH(request: Request) {
  const store  = await cookies();
  const userId = store.get(BUYER_COOKIE)?.value ?? null;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: { full_name?: string | null; phone?: string | null; phone2?: string | null };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const sets: string[]   = [];
  const values: unknown[] = [];
  let idx = 1;

  if ('full_name' in body) { sets.push(`full_name = $${idx++}`); values.push(body.full_name?.trim() || null); }
  if ('phone'     in body) { sets.push(`phone     = $${idx++}`); values.push(body.phone?.trim()     || null); }
  if ('phone2'    in body) { sets.push(`phone2    = $${idx++}`); values.push(body.phone2?.trim()    || null); }

  if (sets.length === 0)
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  values.push(userId);
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`, values);

  return NextResponse.json({ ok: true });
}
