import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';
import { writeStockEvent } from '@/lib/stock';
import { emailLowStockAlert } from '@/lib/email';

interface RouteContext {
  params: Promise<{ id: string; vid: string }>;
}

// POST /api/listings/[id]/variants/[vid]/adjust
// Body: { quantity_delta: number, reason: string }
// quantity_delta: signed integer (positive = add, negative = remove)
// reason is REQUIRED for manual_adjustment
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: listingId, vid: variantId } = await params;
  const sellerId = await getSellerId();
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  let body: { quantity_delta?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const delta = Number(body.quantity_delta);
  if (!Number.isInteger(delta) || delta === 0) {
    return NextResponse.json(
      { error: 'quantity_delta must be a non-zero integer' },
      { status: 400 },
    );
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) {
    return NextResponse.json(
      { error: 'reason is required for manual adjustments' },
      { status: 400 },
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify variant belongs to a listing owned by this seller, lock for update
    const { rows } = await client.query(
      `SELECT lv.id, lv.stock_count
       FROM listing_variants lv
       JOIN listings l ON l.id = lv.listing_id
       WHERE lv.id = $1 AND l.id = $2 AND l.seller_id = $3
       FOR UPDATE`,
      [variantId, listingId, sellerId],
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    const currentStock: number = rows[0].stock_count;
    if (currentStock + delta < 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: `Adjustment would result in negative stock (current: ${currentStock}, delta: ${delta})` },
        { status: 400 },
      );
    }

    // Apply the delta
    await client.query(
      `UPDATE listing_variants SET stock_count = stock_count + $1 WHERE id = $2`,
      [delta, variantId],
    );

    const result = await writeStockEvent(client, variantId, 'manual_adjustment', delta, reason);

    await client.query('COMMIT');

    if (result.lowStockCrossed && result.threshold != null) {
      fireAlert(variantId, result.stockAfter, result.threshold);
    }

    return NextResponse.json({ ok: true, stock_count: result.stockAfter });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[adjust] error:', err);
    return NextResponse.json({ error: 'Failed to adjust stock. Please try again.' }, { status: 500 });
  } finally {
    client.release();
  }
}

function fireAlert(variantId: string, stockAfter: number, threshold: number) {
  pool.query(
    `SELECT lv.attributes, l.id AS listing_id, l.title,
            u.email AS seller_email, s.business_name
     FROM listing_variants lv
     JOIN listings l ON l.id = lv.listing_id
     JOIN sellers s ON s.id = l.seller_id
     LEFT JOIN users u ON u.id = s.user_id
     WHERE lv.id = $1`,
    [variantId],
  ).then(({ rows }) => {
    if (rows.length === 0 || !rows[0].seller_email) return;
    const row = rows[0];
    const attrs: Record<string, string> = row.attributes ?? {};
    const variantDesc = Object.keys(attrs).length > 0
      ? Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(', ')
      : 'Default variant';
    emailLowStockAlert({
      sellerEmail: row.seller_email,
      sellerName: row.business_name,
      listingTitle: row.title,
      variantDesc,
      stockAfter,
      threshold,
      listingId: row.listing_id,
    }).catch((err) => console.error('[email] low-stock alert (adjust):', err));
  }).catch((err) => console.error('[adjust] alert query error:', err));
}
