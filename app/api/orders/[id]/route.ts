import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getBuyerId, getSellerId } from '@/lib/cookie';
import { completeSourceAReferral } from '@/lib/referral-completion';
import {
  emailOrderConfirmedBuyer,
  emailOrderFulfilledBuyer,
  emailOrderCancelledBuyer,
  emailLowStockAlert,
} from '@/lib/email';
import { writeStockEvent } from '@/lib/stock';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  awaiting_payment:    ['cancelled'],
  payment_claimed:     ['confirmed_by_seller', 'cancelled'],
  confirmed_by_seller: ['fulfilled', 'cancelled'],
  fulfilled:           [],
  cancelled:           [],
};

// GET /api/orders/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const [buyerId, sellerId] = await Promise.all([getBuyerId(), getSellerId()]);

  if (!buyerId && !sellerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT
       o.id,
       o.checkout_session_id,
       o.buyer_id,
       o.seller_id,
       o.line_items,
       o.total,
       o.status,
       o.receipt_attachment_url,
       o.date_created,
       o.date_updated,
       s.business_name,
       s.slug          AS seller_slug,
       s.state         AS seller_state,
       s.city_area     AS seller_city,
       s.verified_status,
       s.bank_account_name,
       s.bank_account_number,
       s.bank_name,
       cs.delivery_method,
       cs.delivery_address,
       cs.buyer_phone,
       cs.buyer_email,
       cs.created_at   AS session_created_at
     FROM orders o
     JOIN sellers          s  ON s.id  = o.seller_id
     JOIN checkout_sessions cs ON cs.id = o.checkout_session_id
     WHERE o.id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const row = rows[0];

  // Auth: must be the buyer or seller for this order
  if (row.buyer_id !== buyerId && row.seller_id !== sellerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const order = {
    id: row.id,
    checkout_session_id: row.checkout_session_id,
    buyer_id: row.buyer_id,
    seller_id: row.seller_id,
    line_items: row.line_items,
    total: parseFloat(row.total),
    status: row.status,
    receipt_attachment_url: row.receipt_attachment_url,
    date_created: row.date_created,
    date_updated: row.date_updated,
    seller: {
      business_name: row.business_name,
      slug: row.seller_slug,
      state: row.seller_state,
      city_area: row.seller_city,
      verified_status: row.verified_status,
      bank_account_name: row.bank_account_name,
      bank_account_number: row.bank_account_number,
      bank_name: row.bank_name,
    },
    checkout_session: {
      delivery_method: row.delivery_method,
      delivery_address: row.delivery_address,
      buyer_phone: row.buyer_phone,
      buyer_email: row.buyer_email,
      created_at: row.session_created_at,
    },
  };

  return NextResponse.json({ order });
}

// PATCH /api/orders/[id] — seller advances status
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const sellerId = await getSellerId();

  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { status: newStatus } = body;
  if (!newStatus) {
    return NextResponse.json({ error: 'status required' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock and fetch the order
    const { rows } = await client.query(
      `SELECT id, buyer_id, seller_id, status, line_items
       FROM orders WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const order = rows[0];

    if (order.seller_id !== sellerId) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: `Cannot transition from "${order.status}" to "${newStatus}"` },
        { status: 400 },
      );
    }

    // ── Stock decrement at confirmed_by_seller ──────────────────────────────
    // This is the ONLY place stock is decremented.  The UPDATE predicate
    // (stock_count >= qty) is the race-condition guard: if two concurrent
    // confirmations race, the second will find stock_count = 0 and rowCount = 0.
    const lowStockAlerts: Array<{
      variantId: string;
      stockAfter: number;
      threshold: number;
    }> = [];

    if (newStatus === 'confirmed_by_seller') {
      const lineItems: Array<{
        listing_id: string;
        variant_id?: string;
        title: string;
        qty: number;
      }> = order.line_items;

      for (const item of lineItems) {
        if (!item.variant_id) continue; // legacy orders without variant_id — skip

        const { rowCount } = await client.query(
          `UPDATE listing_variants
           SET stock_count = stock_count - $1
           WHERE id = $2 AND stock_count >= $1`,
          [item.qty, item.variant_id],
        );

        if (rowCount === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            {
              error: `"${item.title}" is out of stock. Another order was confirmed first.`,
              out_of_stock_title: item.title,
            },
            { status: 409 },
          );
        }

        // Write platform_sale StockEvent (negative delta = stock consumed)
        const result = await writeStockEvent(
          client,
          item.variant_id,
          'platform_sale',
          -item.qty,
        );
        if (result.lowStockCrossed && result.threshold != null) {
          lowStockAlerts.push({
            variantId: item.variant_id,
            stockAfter: result.stockAfter,
            threshold: result.threshold,
          });
        }
      }
    }

    // Advance the order status
    await client.query(
      `UPDATE orders SET status = $1 WHERE id = $2`,
      [newStatus, id],
    );

    await client.query('COMMIT');

    // When an order is fulfilled, try to complete a pending Source-A referral
    // for this buyer × seller pair (best-effort — failure does not block response).
    if (newStatus === 'fulfilled') {
      const refClient = await pool.connect();
      try {
        await completeSourceAReferral(order.buyer_id, order.seller_id, refClient);
      } catch (err) {
        console.error('[referral] Source-A completion error on order', id, err);
      } finally {
        refClient.release();
      }
    }

    // Fire low-stock alerts (fire-and-forget, after COMMIT)
    if (lowStockAlerts.length > 0) {
      pool.query(
        `SELECT
           lv.id AS variant_id,
           lv.attributes,
           l.id AS listing_id,
           l.title AS listing_title,
           u.email AS seller_email,
           s.business_name
         FROM listing_variants lv
         JOIN listings l ON l.id = lv.listing_id
         JOIN sellers s ON s.id = l.seller_id
         LEFT JOIN users u ON u.id = s.user_id
         WHERE lv.id = ANY($1)`,
        [lowStockAlerts.map((a) => a.variantId)],
      ).then(({ rows }) => {
        for (const row of rows) {
          const alert = lowStockAlerts.find((a) => a.variantId === row.variant_id);
          if (!alert || !row.seller_email) continue;
          const attrs: Record<string, string> = row.attributes ?? {};
          const variantDesc = Object.keys(attrs).length > 0
            ? Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(', ')
            : 'Default variant';
          emailLowStockAlert({
            sellerEmail: row.seller_email,
            sellerName: row.business_name,
            listingTitle: row.listing_title,
            variantDesc,
            stockAfter: alert.stockAfter,
            threshold: alert.threshold,
            listingId: row.listing_id,
          }).catch((err) => console.error('[email] low-stock alert:', err));
        }
      }).catch((err) => console.error('[email] low-stock alert query:', err));
    }

    // Notify buyer by email after status change (fire-and-forget, after COMMIT)
    if (['confirmed_by_seller', 'fulfilled', 'cancelled'].includes(newStatus)) {
      pool.query(
        `SELECT u.email, s.business_name, o.total
         FROM orders o
         JOIN checkout_sessions cs ON cs.id = o.checkout_session_id
         JOIN sellers s ON s.id = o.seller_id
         LEFT JOIN users u ON u.id = o.buyer_id
         WHERE o.id = $1`,
        [id],
      ).then(({ rows }) => {
        if (rows.length === 0 || !rows[0].email) return;
        const { email: buyerEmail, business_name: sellerName, total } = rows[0];
        if (newStatus === 'confirmed_by_seller') {
          emailOrderConfirmedBuyer({ buyerEmail, orderId: id, sellerName, total: parseFloat(total) })
            .catch((err) => console.error('[email] order-confirmed buyer notify:', err));
        } else if (newStatus === 'fulfilled') {
          emailOrderFulfilledBuyer({ buyerEmail, orderId: id, sellerName })
            .catch((err) => console.error('[email] order-fulfilled buyer notify:', err));
        } else if (newStatus === 'cancelled') {
          emailOrderCancelledBuyer({ buyerEmail, orderId: id, sellerName })
            .catch((err) => console.error('[email] order-cancelled buyer notify:', err));
        }
      }).catch((err) => console.error('[email] buyer notify query error:', err));
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[orders/patch] transaction error:', err);
    return NextResponse.json({ error: 'Failed to update order. Please try again.' }, { status: 500 });
  } finally {
    client.release();
  }
}
