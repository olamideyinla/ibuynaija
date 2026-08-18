import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getBuyerId } from '@/lib/cookie';

interface RouteContext {
  params: Promise<{ itemId: string }>;
}

// PATCH /api/cart/[itemId] — update quantity (capped by variant stock)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { itemId } = await params;

  let body: { quantity?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { quantity } = body;
  if (!Number.isInteger(quantity) || (quantity as number) < 1) {
    return NextResponse.json({ error: 'quantity must be >= 1' }, { status: 400 });
  }

  // Fetch current cart item + variant stock in one query
  const { rows } = await pool.query(
    `SELECT ci.id, ci.buyer_id, lv.stock_count
     FROM cart_items ci
     JOIN listing_variants lv ON lv.id = ci.variant_id
     WHERE ci.id = $1 AND ci.buyer_id = $2`,
    [itemId, buyerId],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
  }

  const stockCount = rows[0].stock_count;
  if ((quantity as number) > stockCount) {
    return NextResponse.json(
      { error: `Only ${stockCount} in stock`, available: stockCount },
      { status: 409 },
    );
  }

  await pool.query(
    `UPDATE cart_items SET quantity = $1 WHERE id = $2 AND buyer_id = $3`,
    [quantity, itemId, buyerId],
  );

  return NextResponse.json({ ok: true });
}

// DELETE /api/cart/[itemId] — remove item
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { itemId } = await params;

  const { rowCount } = await pool.query(
    `DELETE FROM cart_items WHERE id = $1 AND buyer_id = $2`,
    [itemId, buyerId],
  );

  if (rowCount === 0) {
    return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
