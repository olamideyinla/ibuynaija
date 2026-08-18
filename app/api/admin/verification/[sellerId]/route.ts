import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';
import { computeRankBand } from '@/lib/ranking';

interface Params { params: Promise<{ sellerId: string }> }

export async function GET(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sellerId } = await params;

  const { rows } = await pool.query(
    `SELECT
       s.id, s.business_name, s.slug, s.state, s.city_area,
       s.verified_status, s.verification_requested, s.verified_date,
       s.verified_by,
       u.email AS owner_email, u.phone AS owner_phone
     FROM sellers s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [sellerId],
  );

  if (rows.length === 0) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
  const seller = rows[0];

  // Listings summary
  const { rows: listings } = await pool.query(
    `SELECT id, title, status, made_in_nigeria, date_posted
     FROM listings WHERE seller_id = $1 ORDER BY date_posted DESC LIMIT 20`,
    [sellerId],
  );

  // Reports against this seller's listings
  const { rows: reports } = await pool.query(
    `SELECT lr.id, lr.reason, lr.details, lr.resolved, lr.date_created,
            l.title AS listing_title, l.id AS listing_id
     FROM listing_reports lr
     JOIN listings l ON l.id = lr.listing_id
     WHERE l.seller_id = $1
     ORDER BY lr.date_created DESC`,
    [sellerId],
  );

  // Optional rank_band for a given buyer location
  const url = new URL(request.url);
  const buyer_state = url.searchParams.get('buyer_state') ?? '';
  const buyer_city  = url.searchParams.get('buyer_city')  ?? '';
  const rank_band = computeRankBand(
    { verified_status: seller.verified_status, state: seller.state, city_area: seller.city_area },
    { buyer_state, buyer_city },
  );

  return NextResponse.json({ seller, listings, reports, rank_band });
}

export async function POST(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sellerId } = await params;

  let body: { action?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action } = body;
  if (!['approve', 'reject', 'revoke'].includes(action ?? '')) {
    return NextResponse.json({ error: 'action must be approve, reject, or revoke' }, { status: 400 });
  }

  // Check seller exists
  const { rows } = await pool.query('SELECT id, verified_status, verification_requested FROM sellers WHERE id = $1', [sellerId]);
  if (rows.length === 0) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });

  if (action === 'approve') {
    await pool.query(
      `UPDATE sellers
       SET verified_status = true, verification_requested = false,
           verified_date = NOW(), verified_by = $2
       WHERE id = $1`,
      [sellerId, session.id],
    );
  } else if (action === 'reject') {
    await pool.query(
      `UPDATE sellers
       SET verification_requested = false
       WHERE id = $1`,
      [sellerId],
    );
  } else if (action === 'revoke') {
    await pool.query(
      `UPDATE sellers
       SET verified_status = false, verification_requested = false,
           verified_date = NULL, verified_by = NULL
       WHERE id = $1`,
      [sellerId],
    );
  }

  const { rows: updated } = await pool.query(
    'SELECT id, verified_status, verification_requested FROM sellers WHERE id = $1',
    [sellerId],
  );

  return NextResponse.json({ ok: true, seller: updated[0] });
}
