import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';
import { writeStockEvent } from '@/lib/stock';
import { emailLowStockAlert } from '@/lib/email';

// GET /api/offline-sales — list seller's offline sales (recent 100)
export async function GET(_req: NextRequest) {
  const sellerId = await getSellerId();
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT
       os.id, os.seller_id, os.amount::float, os.date::text,
       os.note, os.listing_id, os.variant_id, os.quantity,
       os.date_created::text,
       l.title AS listing_title,
       lv.attributes AS variant_attributes
     FROM offline_sales os
     LEFT JOIN listings l ON l.id = os.listing_id
     LEFT JOIN listing_variants lv ON lv.id = os.variant_id
     WHERE os.seller_id = $1
     ORDER BY os.date DESC, os.date_created DESC
     LIMIT 100`,
    [sellerId],
  );

  return NextResponse.json({ sales: rows });
}

// POST /api/offline-sales — log a new offline sale
// Body: { amount, date, note?, listing_id?, variant_id?, quantity? }
export async function POST(req: NextRequest) {
  const sellerId = await getSellerId();
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  let body: {
    amount?: unknown;
    date?: unknown;
    note?: unknown;
    listing_id?: unknown;
    variant_id?: unknown;
    quantity?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  const date = typeof body.date === 'string' ? body.date.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }

  const note       = typeof body.note === 'string' ? body.note.trim() || null : null;
  const listingId  = typeof body.listing_id === 'string' ? body.listing_id : null;
  const variantId  = typeof body.variant_id === 'string' ? body.variant_id : null;
  const quantity   = Number(body.quantity ?? 1);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 });
  }

  // If variant_id supplied, validate ownership and sufficient stock
  if (variantId) {
    const { rows: check } = await pool.query(
      `SELECT lv.id, lv.stock_count
       FROM listing_variants lv
       JOIN listings l ON l.id = lv.listing_id
       WHERE lv.id = $1 AND l.seller_id = $2`,
      [variantId, sellerId],
    );
    if (check.length === 0) {
      return NextResponse.json({ error: 'Variant not found or not yours' }, { status: 404 });
    }
    if (check[0].stock_count < quantity) {
      return NextResponse.json(
        { error: `Only ${check[0].stock_count} unit(s) in stock — cannot log sale of ${quantity}` },
        { status: 400 },
      );
    }
  }

  const client = await pool.connect();
  let lowStockAlert: { variantId: string; stockAfter: number; threshold: number } | null = null;

  try {
    await client.query('BEGIN');

    // Insert the offline sale record
    const { rows: [sale] } = await client.query(
      `INSERT INTO offline_sales
         (seller_id, amount, date, note, listing_id, variant_id, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, seller_id, amount::float, date::text, note, listing_id, variant_id, quantity, date_created::text`,
      [sellerId, amount, date, note, listingId, variantId, quantity],
    );

    // If linked to a variant: decrement stock + write StockEvent
    if (variantId) {
      const { rowCount } = await client.query(
        `UPDATE listing_variants
         SET stock_count = stock_count - $1
         WHERE id = $2 AND stock_count >= $1`,
        [quantity, variantId],
      );

      if (rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Insufficient stock — another operation updated this variant simultaneously.' },
          { status: 409 },
        );
      }

      const result = await writeStockEvent(
        client,
        variantId,
        'offline_sale',
        -quantity,
        note ?? undefined,
      );

      if (result.lowStockCrossed && result.threshold != null) {
        lowStockAlert = { variantId, stockAfter: result.stockAfter, threshold: result.threshold };
      }
    }

    await client.query('COMMIT');

    // Fire low-stock alert after COMMIT (fire-and-forget)
    if (lowStockAlert) {
      const alert = lowStockAlert;
      pool.query(
        `SELECT lv.attributes, l.id AS listing_id, l.title,
                u.email AS seller_email, s.business_name
         FROM listing_variants lv
         JOIN listings l ON l.id = lv.listing_id
         JOIN sellers s ON s.id = l.seller_id
         LEFT JOIN users u ON u.id = s.user_id
         WHERE lv.id = $1`,
        [alert.variantId],
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
          stockAfter: alert.stockAfter,
          threshold: alert.threshold,
          listingId: row.listing_id,
        }).catch((err) => console.error('[email] low-stock alert (offline_sale):', err));
      }).catch((err) => console.error('[offline-sales] alert query:', err));
    }

    return NextResponse.json({ ok: true, sale }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[offline-sales/post] error:', err);
    return NextResponse.json({ error: 'Failed to log sale. Please try again.' }, { status: 500 });
  } finally {
    client.release();
  }
}
