/**
 * POST /api/seller/name-change
 *
 * Seller requests a correction to their business_name. Does not take effect
 * immediately — an admin must approve it via /admin/name-changes.
 * Resubmitting overwrites any existing pending request.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { emailAdminNewNameChangeRequest } from '@/lib/email';

export async function POST(request: Request) {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { requested_name?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const requestedName = body.requested_name?.trim() ?? '';
  if (!requestedName) {
    return NextResponse.json({ error: 'Business name cannot be empty' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT s.business_name, u.email AS owner_email
     FROM sellers s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [sellerId],
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
  }
  const currentName = rows[0].business_name;
  if (currentName.trim().toLowerCase() === requestedName.toLowerCase()) {
    return NextResponse.json({ error: 'That is already your business name' }, { status: 400 });
  }

  await pool.query(
    `UPDATE sellers SET
       pending_business_name       = $1,
       name_change_requested_at    = NOW(),
       name_change_rejected_reason = NULL
     WHERE id = $2`,
    [requestedName, sellerId],
  );

  if (rows[0].owner_email) {
    emailAdminNewNameChangeRequest({
      currentName,
      requestedName,
      ownerEmail: rows[0].owner_email,
    }).catch((err) => console.error('[email] admin name-change notify:', err));
  }

  return NextResponse.json({ ok: true, pending_business_name: requestedName });
}
