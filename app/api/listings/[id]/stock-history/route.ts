import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/listings/[id]/stock-history
// Returns all stock events for all variants of this listing (seller-only).
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: listingId } = await params;
  const sellerId = await getSellerId();
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  // Verify ownership
  const { rows: listing } = await pool.query(
    `SELECT id FROM listings WHERE id = $1 AND seller_id = $2`,
    [listingId, sellerId],
  );
  if (listing.length === 0) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const { rows } = await pool.query(
    `SELECT
       se.id,
       se.variant_id,
       lv.attributes,
       lv.stock_count AS current_stock,
       lv.low_stock_threshold,
       se.change_type,
       se.quantity_delta,
       se.reason,
       se.date_created::text
     FROM stock_events se
     JOIN listing_variants lv ON lv.id = se.variant_id
     WHERE lv.listing_id = $1
     ORDER BY se.date_created DESC
     LIMIT 200`,
    [listingId],
  );

  // Also return current variant summary
  const { rows: variants } = await pool.query(
    `SELECT id, attributes, stock_count, is_available, low_stock_threshold
     FROM listing_variants
     WHERE listing_id = $1
     ORDER BY id`,
    [listingId],
  );

  return NextResponse.json({ events: rows, variants });
}
