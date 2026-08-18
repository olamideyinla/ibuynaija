/**
 * POST /api/listings
 *
 * Create a new listing.  The seller must be authenticated (ibuynaija_seller_id
 * cookie).  At least one variant must be provided; if the client sends a single
 * variant with no attributes it is treated as the implicit "simple" variant.
 *
 * Request body:
 *   title          string  (required)
 *   description    string  (required)
 *   category_id    UUID    (required)
 *   price          number | null  (null = "Price on request")
 *   condition      "new" | "used"
 *   made_in_nigeria boolean  (must be true to publish as active)
 *   photos         string[]
 *   variants       Array<{ attributes: Record<string,string>; price_override?: number|null; stock_count: number }>
 *                  If omitted or empty, a single implicit variant with stock_count=0 is created.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { completeSourceBReferral } from '@/lib/referral-completion';

interface VariantInput {
  attributes?: Record<string, string>;
  price_override?: number | null;
  stock_count: number;
}

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    title?: string;
    description?: string;
    category_id?: string;
    price?: number | null;
    condition?: string;
    made_in_nigeria?: boolean;
    photos?: string[];
    cover_photo_index?: number;
    variants?: VariantInput[];
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    title, description, category_id, price = null,
    condition, made_in_nigeria = true, photos = [],
    cover_photo_index = 0, variants,
  } = body;

  if (!title?.trim())       return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: 'description is required' }, { status: 400 });
  if (!category_id)         return NextResponse.json({ error: 'category_id is required' }, { status: 400 });
  if (!condition || !['new', 'used'].includes(condition))
    return NextResponse.json({ error: 'condition must be "new" or "used"' }, { status: 400 });
  if (!made_in_nigeria)
    return NextResponse.json({ error: 'made_in_nigeria must be true' }, { status: 400 });

  // Require at least one photo
  const safePhotos = Array.isArray(photos) ? photos.filter(p => typeof p === 'string' && p.trim()) : [];
  if (safePhotos.length === 0)
    return NextResponse.json({ error: 'At least one photo is required to publish a listing.' }, { status: 400 });

  // Build the variant list (default: one implicit variant with stock_count=0)
  const variantList: VariantInput[] = variants && variants.length > 0
    ? variants
    : [{ attributes: {}, price_override: null, stock_count: 0 }];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clamp cover_photo_index to valid range (safePhotos validated above)
    const safeCoverIdx = safePhotos.length > 0
      ? Math.max(0, Math.min(Number(cover_photo_index) || 0, safePhotos.length - 1))
      : 0;

    // Insert listing
    const { rows: [listing] } = await client.query(
      `INSERT INTO listings
         (seller_id, title, description, category_id, price, photos,
          cover_photo_index, made_in_nigeria, condition, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
       RETURNING id, status`,
      [sellerId, title.trim(), description.trim(), category_id,
       price ?? null, safePhotos, safeCoverIdx, true, condition],
    );

    // Insert variants (trigger fires per-row and will mark listing 'sold' if
    // all stock=0, but we insert in the transaction so it's consistent)
    for (const v of variantList) {
      await client.query(
        `INSERT INTO listing_variants (listing_id, attributes, price_override, stock_count)
         VALUES ($1, $2, $3, $4)`,
        [listing.id, JSON.stringify(v.attributes ?? {}), v.price_override ?? null, v.stock_count],
      );
    }

    await client.query('COMMIT');

    // Re-fetch status in case trigger flipped it to 'sold'
    const { rows: [fresh] } = await client.query(
      'SELECT id, status FROM listings WHERE id = $1',
      [listing.id],
    );

    // If this is the seller's first active listing, complete any pending
    // Source-B referral (fire-and-forget — failure does not block the response).
    if (fresh.status === 'active') {
      const { rows: [{ cnt }] } = await pool.query(
        `SELECT COUNT(*) AS cnt FROM listings WHERE seller_id = $1 AND status = 'active'`,
        [sellerId],
      );
      if (parseInt(cnt, 10) === 1) {
        const refClient = await pool.connect();
        completeSourceBReferral(sellerId, refClient)
          .catch(err => console.error('[referral] Source-B completion error:', err))
          .finally(() => refClient.release());
      }
    }

    return NextResponse.json({ id: fresh.id, status: fresh.status }, { status: 201 });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /api/listings]', err);
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  } finally {
    client.release();
  }
}
