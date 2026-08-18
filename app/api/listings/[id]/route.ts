/**
 * GET    /api/listings/[id]  — public, returns listing + variants
 * PATCH  /api/listings/[id]  — seller-auth, update listing fields (not variants)
 * DELETE /api/listings/[id]  — seller-auth, delete listing (cascade deletes variants)
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';

interface Params { params: Promise<{ id: string }> }

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const { rows } = await pool.query(
    `SELECT l.id, l.title, l.description, l.price, l.photos, l.cover_photo_index,
            l.condition, l.status, l.made_in_nigeria, l.date_posted, l.category_id,
            l.seller_id,
            json_agg(
              json_build_object(
                'id',             lv.id,
                'attributes',     lv.attributes,
                'price_override', lv.price_override,
                'stock_count',    lv.stock_count,
                'is_available',   lv.is_available
              ) ORDER BY lv.id
            ) AS variants
     FROM listings l
     LEFT JOIN listing_variants lv ON lv.listing_id = l.id
     WHERE l.id = $1
     GROUP BY l.id`,
    [id],
  );
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Confirm ownership
  const { rows: [listing] } = await pool.query(
    'SELECT id, seller_id FROM listings WHERE id = $1',
    [id],
  );
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (listing.seller_id !== sellerId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Reject attempts to remove all photos from a listing
  if ('photos' in body && Array.isArray(body['photos']) && (body['photos'] as string[]).filter(p => String(p).trim()).length === 0)
    return NextResponse.json({ error: 'At least one photo is required.' }, { status: 400 });

  const allowed = ['title', 'description', 'price', 'condition', 'photos', 'cover_photo_index', 'category_id', 'status'];
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (!(key in body)) continue;

    if (key === 'cover_photo_index') {
      const val = Number(body[key]);
      if (!Number.isInteger(val) || val < 0)
        return NextResponse.json({ error: 'cover_photo_index must be a non-negative integer' }, { status: 400 });
      // Validate against photos being updated in the same request (if provided)
      if ('photos' in body && Array.isArray(body['photos']) && val >= (body['photos'] as string[]).length)
        return NextResponse.json({ error: 'cover_photo_index out of range for provided photos' }, { status: 400 });
      sets.push(`${key} = $${idx++}`);
      values.push(val);
      continue;
    }

    sets.push(`${key} = $${idx++}`);
    values.push(body[key]);
  }
  if (sets.length === 0)
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });

  values.push(id);
  await pool.query(
    `UPDATE listings SET ${sets.join(', ')}, date_updated = NOW() WHERE id = $${idx}`,
    values,
  );

  return NextResponse.json({ ok: true });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;

  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { rows: [listing] } = await pool.query(
    'SELECT id, seller_id FROM listings WHERE id = $1',
    [id],
  );
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (listing.seller_id !== sellerId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // CASCADE deletes variants via FK
  await pool.query('DELETE FROM listings WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
