import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';

// GET /api/promotions — list all promotions for the authenticated seller
export async function GET() {
  const sellerId = await getSellerId();
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT
       p.id, p.scope, p.listing_id, p.discount_type, p.discount_value::float AS discount_value,
       p.start_date::text, p.end_date::text, p.date_created::text,
       l.title AS listing_title,
       CASE
         WHEN NOW() < p.start_date THEN 'upcoming'
         WHEN NOW() > p.end_date   THEN 'expired'
         ELSE 'active'
       END AS status
     FROM promotions p
     LEFT JOIN listings l ON l.id = p.listing_id
     WHERE p.seller_id = $1
     ORDER BY p.start_date DESC`,
    [sellerId],
  );

  return NextResponse.json({ promotions: rows });
}

// POST /api/promotions — create a new promotion
export async function POST(req: NextRequest) {
  const sellerId = await getSellerId();
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  let body: {
    scope?: string;
    listing_id?: string | null;
    discount_type?: string;
    discount_value?: number;
    start_date?: string;
    end_date?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { scope, listing_id = null, discount_type, discount_value, start_date, end_date } = body;

  // Validate scope
  if (!scope || !['single_listing', 'all_listings'].includes(scope)) {
    return NextResponse.json({ error: 'scope must be "single_listing" or "all_listings"' }, { status: 400 });
  }
  if (scope === 'single_listing' && !listing_id) {
    return NextResponse.json({ error: 'listing_id required when scope is "single_listing"' }, { status: 400 });
  }
  if (scope === 'all_listings' && listing_id) {
    return NextResponse.json({ error: 'listing_id must be null when scope is "all_listings"' }, { status: 400 });
  }

  // Validate discount
  if (!discount_type || !['percentage', 'fixed_amount'].includes(discount_type)) {
    return NextResponse.json({ error: 'discount_type must be "percentage" or "fixed_amount"' }, { status: 400 });
  }
  if (!discount_value || typeof discount_value !== 'number' || discount_value <= 0) {
    return NextResponse.json({ error: 'discount_value must be a positive number' }, { status: 400 });
  }
  if (discount_type === 'percentage' && discount_value > 100) {
    return NextResponse.json({ error: 'Percentage discount cannot exceed 100' }, { status: 400 });
  }

  // Validate dates
  if (!start_date || !end_date) {
    return NextResponse.json({ error: 'start_date and end_date required' }, { status: 400 });
  }
  const startTs = new Date(start_date).getTime();
  const endTs   = new Date(end_date).getTime();
  if (isNaN(startTs) || isNaN(endTs)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }
  if (endTs <= startTs) {
    return NextResponse.json({ error: 'end_date must be after start_date' }, { status: 400 });
  }

  // If single_listing, verify the listing belongs to this seller
  if (scope === 'single_listing') {
    const { rows } = await pool.query(
      `SELECT id FROM listings WHERE id = $1 AND seller_id = $2`,
      [listing_id, sellerId],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Listing not found or does not belong to you' }, { status: 404 });
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO promotions
       (seller_id, scope, listing_id, discount_type, discount_value, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, scope, listing_id, discount_type,
               discount_value::float AS discount_value,
               start_date::text, end_date::text, date_created::text`,
    [sellerId, scope, listing_id ?? null, discount_type, discount_value, start_date, end_date],
  );

  return NextResponse.json({ promotion: rows[0] }, { status: 201 });
}
