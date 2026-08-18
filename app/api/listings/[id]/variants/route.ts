/**
 * GET  /api/listings/[id]/variants  — public, lists all variants
 * POST /api/listings/[id]/variants  — seller-auth, add a new variant
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const { rows } = await pool.query(
    `SELECT id, listing_id, attributes, price_override, stock_count, is_available
     FROM listing_variants WHERE listing_id = $1 ORDER BY id`,
    [id],
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Confirm listing ownership
  const { rows: [listing] } = await pool.query(
    'SELECT id, seller_id FROM listings WHERE id = $1',
    [id],
  );
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (listing.seller_id !== sellerId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { attributes?: Record<string, string>; price_override?: number | null; stock_count?: number };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { attributes = {}, price_override = null, stock_count = 0 } = body;
  if (typeof stock_count !== 'number' || stock_count < 0)
    return NextResponse.json({ error: 'stock_count must be a non-negative integer' }, { status: 400 });

  const { rows: [variant] } = await pool.query(
    `INSERT INTO listing_variants (listing_id, attributes, price_override, stock_count)
     VALUES ($1, $2, $3, $4)
     RETURNING id, listing_id, attributes, price_override, stock_count, is_available`,
    [id, JSON.stringify(attributes), price_override, Math.floor(stock_count)],
  );

  return NextResponse.json(variant, { status: 201 });
}
