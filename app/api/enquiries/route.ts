/**
 * POST /api/enquiries
 * Buyer clicks "Enquire" on a listing — logs interest, gates rating eligibility.
 * Idempotent: a second click on the same listing returns 200 without error.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { BUYER_COOKIE } from '@/lib/cookie';

export async function POST(request: Request) {
  const store = await cookies();
  const buyerId = store.get(BUYER_COOKIE)?.value ?? null;
  if (!buyerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { listing_id } = body;
  if (!listing_id || typeof listing_id !== 'string') {
    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
  }

  // Confirm listing exists and is active
  const { rows: [listing] } = await pool.query(
    `SELECT id FROM listings WHERE id = $1 AND status = 'active'`,
    [listing_id],
  );
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  // UNIQUE (buyer_id, listing_id) — second click is a no-op
  await pool.query(
    `INSERT INTO enquiries (buyer_id, listing_id)
     VALUES ($1, $2)
     ON CONFLICT (buyer_id, listing_id) DO NOTHING`,
    [buyerId, listing_id],
  );

  return NextResponse.json({ ok: true });
}
