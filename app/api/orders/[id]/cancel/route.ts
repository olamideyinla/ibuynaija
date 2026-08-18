import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getBuyerId, getSellerId } from '@/lib/cookie';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/orders/[id]/cancel — buyer or seller cancels order
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const [buyerId, sellerId] = await Promise.all([getBuyerId(), getSellerId()]);

  if (!buyerId && !sellerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT id, buyer_id, seller_id, status FROM orders WHERE id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const order = rows[0];

  // Auth: must be the buyer or seller for this order
  if (order.buyer_id !== buyerId && order.seller_id !== sellerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (order.status === 'fulfilled' || order.status === 'cancelled') {
    return NextResponse.json(
      { error: `Cannot cancel an order with status "${order.status}"` },
      { status: 400 },
    );
  }

  await pool.query(
    `UPDATE orders SET status = 'cancelled' WHERE id = $1`,
    [id],
  );

  return NextResponse.json({ ok: true, status: 'cancelled' });
}
