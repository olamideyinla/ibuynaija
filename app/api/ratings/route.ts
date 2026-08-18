/**
 * POST /api/ratings
 *
 * A buyer may rate a listing only if they have:
 *   - A fulfilled order containing that listing, OR
 *   - An existing enquiry on that listing
 *
 * One rating per buyer per listing (enforced by DB UNIQUE constraint).
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getBuyerId } from '@/lib/cookie';

export async function POST(req: NextRequest) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: {
    listing_id?: string;
    buying_experience_score?: number;
    product_quality_score?: number;
    comment?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { listing_id, buying_experience_score, product_quality_score, comment } = body;

  if (!listing_id) {
    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
  }

  const beScore = Number(buying_experience_score);
  const pqScore = Number(product_quality_score);

  if (!Number.isInteger(beScore) || beScore < 1 || beScore > 5) {
    return NextResponse.json({ error: 'buying_experience_score must be 1–5' }, { status: 400 });
  }
  if (!Number.isInteger(pqScore) || pqScore < 1 || pqScore > 5) {
    return NextResponse.json({ error: 'product_quality_score must be 1–5' }, { status: 400 });
  }

  // Verify the listing exists
  const { rows: listingRows } = await pool.query(
    `SELECT id FROM listings WHERE id = $1`,
    [listing_id],
  );
  if (listingRows.length === 0) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  // Gate: buyer must have a fulfilled order containing this listing OR an enquiry on it
  const { rows: eligibleRows } = await pool.query(
    `SELECT 1
     FROM (
       -- fulfilled order containing this listing
       SELECT 1
       FROM orders o
       WHERE o.buyer_id = $1
         AND o.status   = 'fulfilled'
         AND EXISTS (
           SELECT 1
           FROM jsonb_array_elements(o.line_items) li
           WHERE li->>'listing_id' = $2
         )
       UNION ALL
       -- enquiry on this listing
       SELECT 1
       FROM enquiries
       WHERE buyer_id  = $1
         AND listing_id = $2
     ) AS eligible
     LIMIT 1`,
    [buyerId, listing_id],
  );

  if (eligibleRows.length === 0) {
    return NextResponse.json(
      { error: 'You can only rate a listing you have ordered or enquired about' },
      { status: 403 },
    );
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO ratings (buyer_id, listing_id, buying_experience_score, product_quality_score, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [buyerId, listing_id, beScore, pqScore, comment?.trim() || null],
    );
    return NextResponse.json({ ok: true, rating_id: rows[0].id }, { status: 201 });
  } catch (err: unknown) {
    // Unique constraint violation — buyer already rated this listing
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      return NextResponse.json({ error: 'You have already rated this listing' }, { status: 409 });
    }
    console.error('[ratings/post]', err);
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 });
  }
}
