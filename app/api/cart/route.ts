import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getBuyerId } from '@/lib/cookie';
import { ACTIVE_PROMO_LATERAL, effectivePriceSql } from '@/lib/promotions';

// GET /api/cart — list cart items with listing + variant + seller info
export async function GET() {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT
       ci.id,
       ci.buyer_id,
       ci.listing_id,
       ci.variant_id,
       ci.quantity,
       ci.added_at,
       l.title,
       l.photos,
       l.status        AS listing_status,
       l.condition,
       l.status <> 'active' AS is_stale,
       COALESCE(lv.price_override, l.price)                AS original_price,
       ${effectivePriceSql('COALESCE(lv.price_override, l.price)')} AS price,
       lv.attributes   AS variant_attributes,
       lv.stock_count  AS variant_stock,
       s.id            AS seller_id,
       s.business_name,
       s.slug          AS seller_slug,
       s.state         AS seller_state,
       s.city_area     AS seller_city,
       s.verified_status
     FROM cart_items ci
     JOIN listings         l  ON l.id  = ci.listing_id
     JOIN listing_variants lv ON lv.id = ci.variant_id
     JOIN sellers          s  ON s.id  = l.seller_id
     ${ACTIVE_PROMO_LATERAL('l')}
     WHERE ci.buyer_id = $1
     ORDER BY ci.added_at ASC`,
    [buyerId],
  );

  const items = rows.map((r) => ({
    id: r.id,
    buyer_id: r.buyer_id,
    listing_id: r.listing_id,
    variant_id: r.variant_id,
    quantity: r.quantity,
    added_at: r.added_at,
    is_stale: r.is_stale,
    variant_attributes: r.variant_attributes ?? {},
    variant_stock: r.variant_stock,
    listing: {
      id: r.listing_id,
      title: r.title,
      price: r.price,           // effective price (post-promotion)
      original_price: r.original_price,  // pre-promotion, for strike-through display
      photos: r.photos,
      status: r.listing_status,
      condition: r.condition,
      seller: {
        id: r.seller_id,
        business_name: r.business_name,
        slug: r.seller_slug,
        state: r.seller_state,
        city_area: r.seller_city,
        verified_status: r.verified_status,
      },
    },
  }));

  return NextResponse.json({ items });
}

// POST /api/cart — add item (or increment quantity if same variant already in cart)
export async function POST(req: NextRequest) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { listing_id?: string; variant_id?: string; quantity?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { listing_id, quantity = 1 } = body;
  let { variant_id } = body;

  if (!listing_id) {
    return NextResponse.json({ error: 'listing_id required' }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 });
  }

  // Verify listing is active and has a price
  const { rows: listingRows } = await pool.query(
    `SELECT id, status, price FROM listings WHERE id = $1`,
    [listing_id],
  );
  if (listingRows.length === 0) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }
  const listing = listingRows[0];
  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'Listing is not available' }, { status: 400 });
  }
  if (listing.price === null) {
    return NextResponse.json(
      { error: 'This listing is a quote-only item and cannot be added to cart' },
      { status: 400 },
    );
  }

  // Resolve variant_id: if not supplied, auto-select the implicit single variant
  if (!variant_id) {
    const { rows: variantRows } = await pool.query(
      `SELECT id, stock_count FROM listing_variants WHERE listing_id = $1`,
      [listing_id],
    );
    if (variantRows.length === 0) {
      return NextResponse.json({ error: 'No variants found for this listing' }, { status: 400 });
    }
    if (variantRows.length > 1) {
      // Multi-variant listing — the caller must specify which variant
      return NextResponse.json(
        { error: 'variant_id required for multi-variant listings' },
        { status: 400 },
      );
    }
    variant_id = variantRows[0].id;
  }

  // Stock gate: verify variant exists, belongs to listing, and has enough stock
  const { rows: variantRows } = await pool.query(
    `SELECT id, stock_count FROM listing_variants WHERE id = $1 AND listing_id = $2`,
    [variant_id, listing_id],
  );
  if (variantRows.length === 0) {
    return NextResponse.json({ error: 'Variant not found for this listing' }, { status: 404 });
  }
  const variant = variantRows[0];

  // Check current cart qty for this variant (to prevent total exceeding stock)
  const { rows: existingRows } = await pool.query(
    `SELECT quantity FROM cart_items WHERE buyer_id = $1 AND variant_id = $2`,
    [buyerId, variant_id],
  );
  const existingQty = existingRows.length > 0 ? existingRows[0].quantity : 0;
  const newTotal = existingQty + quantity;

  if (newTotal > variant.stock_count) {
    return NextResponse.json(
      {
        error: `Only ${variant.stock_count} in stock (you already have ${existingQty} in your cart)`,
        available: variant.stock_count,
        in_cart: existingQty,
      },
      { status: 409 },
    );
  }

  // Upsert — increment quantity on conflict with the same (buyer, variant)
  const { rows: upserted } = await pool.query(
    `INSERT INTO cart_items (buyer_id, listing_id, variant_id, quantity)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (buyer_id, variant_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
     RETURNING id, quantity`,
    [buyerId, listing_id, variant_id, quantity],
  );

  return NextResponse.json({ item: upserted[0] }, { status: 201 });
}
