/**
 * PATCH  /api/listings/[id]/variants/[vid]  — update stock, price_override, or attributes
 * DELETE /api/listings/[id]/variants/[vid]  — remove a variant (listing must keep ≥ 1)
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';

interface Params { params: Promise<{ id: string; vid: string }> }

async function assertOwnership(listingId: string, sellerId: string) {
  const { rows: [listing] } = await pool.query(
    'SELECT seller_id FROM listings WHERE id = $1',
    [listingId],
  );
  if (!listing) return 'not_found' as const;
  if (listing.seller_id !== sellerId) return 'forbidden' as const;
  return 'ok' as const;
}

export async function PATCH(request: Request, { params }: Params) {
  const { id, vid } = await params;

  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const ownership = await assertOwnership(id, sellerId);
  if (ownership === 'not_found') return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (ownership === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { stock_count?: number; price_override?: number | null; attributes?: Record<string, string> };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if ('stock_count' in body) {
    if (typeof body.stock_count !== 'number' || body.stock_count < 0)
      return NextResponse.json({ error: 'stock_count must be a non-negative integer' }, { status: 400 });
    sets.push(`stock_count = $${idx++}`);
    values.push(Math.floor(body.stock_count));
  }
  if ('price_override' in body) {
    sets.push(`price_override = $${idx++}`);
    values.push(body.price_override ?? null);
  }
  if ('attributes' in body) {
    sets.push(`attributes = $${idx++}`);
    values.push(JSON.stringify(body.attributes));
  }

  if (sets.length === 0)
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });

  values.push(vid, id);
  const { rows: [variant] } = await pool.query(
    `UPDATE listing_variants
     SET ${sets.join(', ')}
     WHERE id = $${idx++} AND listing_id = $${idx}
     RETURNING id, listing_id, attributes, price_override, stock_count, is_available`,
    values,
  );

  if (!variant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  return NextResponse.json(variant);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, vid } = await params;

  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const ownership = await assertOwnership(id, sellerId);
  if (ownership === 'not_found') return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (ownership === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Must keep at least 1 variant
  const { rows: [{ count }] } = await pool.query(
    'SELECT COUNT(*) FROM listing_variants WHERE listing_id = $1',
    [id],
  );
  if (parseInt(count) <= 1)
    return NextResponse.json({ error: 'A listing must have at least one variant' }, { status: 422 });

  const { rowCount } = await pool.query(
    'DELETE FROM listing_variants WHERE id = $1 AND listing_id = $2',
    [vid, id],
  );
  if (rowCount === 0) return NextResponse.json({ error: 'Variant not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
