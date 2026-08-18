import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getBuyerId } from '@/lib/cookie';
import { sendSms } from '@/lib/termii';
import { formatNaira } from '@/lib/format';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/orders/[id]/claim — buyer claims they have paid
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const buyerId = await getBuyerId();

  if (!buyerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { receipt_attachment_url?: string } = {};
  try {
    body = await req.json();
  } catch {
    // receipt URL is optional — ignore parse failure
  }

  // Fetch order + seller phone
  const { rows } = await pool.query(
    `SELECT
       o.id,
       o.buyer_id,
       o.seller_id,
       o.status,
       o.total,
       u.phone AS seller_phone,
       s.business_name
     FROM orders o
     JOIN sellers s ON s.id = o.seller_id
     JOIN users   u ON u.id = s.user_id
     WHERE o.id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const order = rows[0];

  if (order.buyer_id !== buyerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (order.status !== 'awaiting_payment') {
    return NextResponse.json(
      { error: `Cannot claim payment on an order with status "${order.status}"` },
      { status: 400 },
    );
  }

  // Update status → payment_claimed
  await pool.query(
    `UPDATE orders
     SET status = 'payment_claimed',
         receipt_attachment_url = $1
     WHERE id = $2`,
    [body.receipt_attachment_url ?? null, id],
  );

  // Notify seller via SMS (non-fatal)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ibuynaija.com';
  const total = formatNaira(parseFloat(order.total)) ?? `₦${order.total}`;
  const shortId = id.slice(0, 8).toUpperCase();

  try {
    await sendSms({
      to: order.seller_phone,
      message:
        `iBuyNaija: A buyer has claimed payment of ${total} for order #${shortId}. ` +
        `Log in to review and confirm: ${appUrl}/seller/dashboard/orders/${id}`,
    });
  } catch (err) {
    console.error('[claim] SMS notification failed (non-fatal):', err);
  }

  return NextResponse.json({ ok: true, status: 'payment_claimed' });
}
