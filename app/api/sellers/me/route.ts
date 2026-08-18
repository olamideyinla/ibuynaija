import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';
import { emailAdminNewVerificationRequest } from '@/lib/email';

export async function GET() {
  const sellerId = await getSellerId();
  if (!sellerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT id, business_name, verified_status, verification_requested, verified_date
     FROM sellers WHERE id = $1`,
    [sellerId],
  );
  if (rows.length === 0) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });

  return NextResponse.json({ seller: rows[0] });
}

export async function PATCH(request: Request) {
  const sellerId = await getSellerId();
  if (!sellerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { verification_requested?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.verification_requested !== true) {
    return NextResponse.json({ error: 'Set verification_requested to true to submit a request' }, { status: 400 });
  }

  // Cannot re-request if already verified
  const { rows: check } = await pool.query(
    'SELECT verified_status, verification_requested FROM sellers WHERE id = $1',
    [sellerId],
  );
  if (check.length === 0) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
  if (check[0].verified_status) {
    return NextResponse.json({ error: 'Seller is already verified' }, { status: 400 });
  }

  await pool.query(
    'UPDATE sellers SET verification_requested = true WHERE id = $1',
    [sellerId],
  );

  pool.query(
    `SELECT s.business_name, u.email AS owner_email
     FROM sellers s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [sellerId],
  )
    .then(({ rows }) => {
      if (rows.length === 0 || !rows[0].owner_email) return;
      emailAdminNewVerificationRequest({
        businessName: rows[0].business_name,
        ownerEmail: rows[0].owner_email,
      }).catch((err) => console.error('[email] admin verification-request notify:', err));
    })
    .catch((err) => console.error('[email] admin verification-request lookup:', err));

  return NextResponse.json({ ok: true });
}
