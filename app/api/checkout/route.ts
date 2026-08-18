import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getBuyerId } from '@/lib/cookie';
import { isValidNigerianPhone, normaliseNigerianPhone } from '@/lib/phone';
import { ACTIVE_PROMO_LATERAL, effectivePriceSql } from '@/lib/promotions';
import { emailNewOrderSeller } from '@/lib/email';

// POST /api/checkout — create checkout session + one order per seller
export async function POST(req: NextRequest) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: {
    phone?: string;
    email?: string;
    delivery_method?: string;
    delivery_address?: string;
    delivery_state?: string;
    delivery_fees?: Record<string, number>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { phone, email, delivery_method, delivery_address, delivery_state, delivery_fees } = body;

  // Validate phone
  if (!phone || !isValidNigerianPhone(phone)) {
    return NextResponse.json({ error: 'Valid Nigerian phone number required' }, { status: 400 });
  }
  if (!delivery_method || !['pickup', 'delivery'].includes(delivery_method)) {
    return NextResponse.json({ error: 'delivery_method must be "pickup" or "delivery"' }, { status: 400 });
  }
  if (delivery_method === 'delivery' && !delivery_address?.trim()) {
    return NextResponse.json({ error: 'delivery_address required for delivery orders' }, { status: 400 });
  }

  const normalisedPhone = normaliseNigerianPhone(phone);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch cart items with listing + variant details (lock rows)
    // effective_price = variant price (or listing base) after any active promotion
    const { rows: cartItems } = await client.query(
      `SELECT
         ci.id           AS cart_item_id,
         ci.listing_id,
         ci.variant_id,
         ci.quantity,
         l.title,
         l.status,
         l.seller_id,
         lv.attributes   AS variant_attributes,
         lv.stock_count,
         lv.is_available,
         ${effectivePriceSql('COALESCE(lv.price_override, l.price)')} AS effective_price
       FROM cart_items ci
       JOIN listings         l  ON l.id  = ci.listing_id
       JOIN listing_variants lv ON lv.id = ci.variant_id
       ${ACTIVE_PROMO_LATERAL('l')}
       WHERE ci.buyer_id = $1
       FOR UPDATE OF ci, lv`,
      [buyerId],
    );

    if (cartItems.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Check for stale listings
    const stale = cartItems.filter((i) => i.status !== 'active');
    if (stale.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Cart contains unavailable items. Remove them before checking out.', stale_ids: stale.map((i) => i.cart_item_id) },
        { status: 400 },
      );
    }

    // Check for out-of-stock variants
    const outOfStock = cartItems.filter((i) => !i.is_available || i.quantity > i.stock_count);
    if (outOfStock.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'One or more items are out of stock. Update quantities or remove them.', out_of_stock_ids: outOfStock.map((i) => i.cart_item_id) },
        { status: 409 },
      );
    }

    // Check for quote-only items (null effective_price)
    const noPrice = cartItems.filter((i) => i.effective_price === null);
    if (noPrice.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Cart contains quote-only items that cannot be purchased directly.', affected_ids: noPrice.map((i) => i.cart_item_id) },
        { status: 400 },
      );
    }

    // Create checkout session
    const { rows: sessionRows } = await client.query(
      `INSERT INTO checkout_sessions
         (buyer_id, delivery_method, delivery_address, buyer_phone, buyer_email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [buyerId, delivery_method, delivery_address ?? null, normalisedPhone, email ?? null],
    );
    const checkoutSessionId = sessionRows[0].id;

    // Group items by seller
    const bySeller = new Map<string, typeof cartItems>();
    for (const item of cartItems) {
      const list = bySeller.get(item.seller_id) ?? [];
      list.push(item);
      bySeller.set(item.seller_id, list);
    }

    // Fetch seller delivery_zones so we can re-verify fees server-side
    const sellerIdList = Array.from(bySeller.keys());
    const { rows: sellerZoneRows } = await client.query(
      `SELECT id, delivery_zones FROM sellers WHERE id = ANY($1)`,
      [sellerIdList],
    );
    const sellerZonesMap: Record<string, Record<string, number>> = {};
    for (const r of sellerZoneRows) {
      sellerZonesMap[r.id] = (r.delivery_zones ?? {}) as Record<string, number>;
    }

    function lookupFee(zones: Record<string, number>, state: string): number {
      if (state in zones) return zones[state];
      if ('__default__' in zones) return zones['__default__'];
      return 0;
    }

    // Insert one order per seller
    const orders: { id: string; seller_id: string; total: number }[] = [];
    for (const [sellerId, items] of bySeller) {
      const lineItems = items.map((i) => ({
        listing_id: i.listing_id,
        variant_id: i.variant_id,
        variant_attributes: i.variant_attributes ?? {},
        title: i.title,
        qty: i.quantity,
        unit_price: parseFloat(i.effective_price),
      }));
      const total = lineItems.reduce((sum, li) => sum + li.qty * li.unit_price, 0);

      // Compute delivery fee: prefer client-provided value but re-verify against DB zones
      let deliveryFee = 0;
      if (delivery_method === 'delivery' && delivery_state) {
        const zones = sellerZonesMap[sellerId] ?? {};
        // If client sent a fee and DB agrees, use it; otherwise compute from DB
        const dbFee = lookupFee(zones, delivery_state);
        const clientFee = delivery_fees?.[sellerId];
        deliveryFee = clientFee !== undefined && clientFee === dbFee ? clientFee : dbFee;
      }

      const { rows: orderRows } = await client.query(
        `INSERT INTO orders
           (checkout_session_id, buyer_id, seller_id, line_items, total, delivery_fee, status)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, 'awaiting_payment')
         RETURNING id, seller_id, total`,
        [checkoutSessionId, buyerId, sellerId, JSON.stringify(lineItems), total, deliveryFee],
      );
      orders.push(orderRows[0]);
    }

    // Clear cart
    await client.query(`DELETE FROM cart_items WHERE buyer_id = $1`, [buyerId]);

    await client.query('COMMIT');

    // Notify each seller of their new order (fire-and-forget, after COMMIT)
    for (const order of orders) {
      const { rows: sellerRows } = await pool.query(
        `SELECT s.business_name, u.email
         FROM sellers s
         LEFT JOIN users u ON u.id = s.user_id
         WHERE s.id = $1`,
        [order.seller_id],
      );
      if (sellerRows.length > 0 && sellerRows[0].email) {
        emailNewOrderSeller({
          sellerEmail: sellerRows[0].email,
          sellerName: sellerRows[0].business_name,
          orderId: order.id,
          total: order.total,
          buyerPhone: normalisedPhone ?? phone,
        }).catch((err) => console.error('[email] new-order seller notify:', err));
      }
    }

    return NextResponse.json({ checkout_session_id: checkoutSessionId, orders }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[checkout] transaction error:', err);
    return NextResponse.json({ error: 'Checkout failed. Please try again.' }, { status: 500 });
  } finally {
    client.release();
  }
}
