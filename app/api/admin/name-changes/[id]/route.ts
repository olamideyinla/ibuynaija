/**
 * POST /api/admin/name-changes/[id]  — approve or reject a seller's pending
 * business_name change. [id] is the sellers.id, not a separate request id —
 * there's only ever one pending request per seller.
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';
import { emailNameChangeApproved, emailNameChangeRejected } from '@/lib/email';

interface Params { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: { action?: string; rejection_reason?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, rejection_reason } = body;
  if (!['approve', 'reject'].includes(action ?? '')) {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT s.id, s.pending_business_name, u.email AS owner_email, u.full_name AS owner_name
     FROM sellers s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [id],
  );
  if (rows.length === 0) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
  const seller = rows[0];
  if (!seller.pending_business_name) {
    return NextResponse.json({ error: 'No pending name change for this seller' }, { status: 409 });
  }

  if (action === 'reject') {
    const reason = rejection_reason?.trim() || null;
    await pool.query(
      `UPDATE sellers SET
         pending_business_name       = NULL,
         name_change_requested_at    = NULL,
         name_change_rejected_reason = $2
       WHERE id = $1`,
      [id, reason],
    );
    if (seller.owner_email) {
      emailNameChangeRejected({
        ownerEmail: seller.owner_email,
        ownerName: seller.owner_name,
        requestedName: seller.pending_business_name,
        reason,
      }).catch((err) => console.error('[email] name-change rejected notify:', err));
    }
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  const newName = seller.pending_business_name;
  await pool.query(
    `UPDATE sellers SET
       business_name                = $1,
       pending_business_name        = NULL,
       name_change_requested_at     = NULL,
       name_change_rejected_reason  = NULL
     WHERE id = $2`,
    [newName, id],
  );
  if (seller.owner_email) {
    emailNameChangeApproved({
      ownerEmail: seller.owner_email,
      ownerName: seller.owner_name,
      newBusinessName: newName,
    }).catch((err) => console.error('[email] name-change approved notify:', err));
  }

  return NextResponse.json({ ok: true, status: 'approved' });
}
