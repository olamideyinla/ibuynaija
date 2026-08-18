import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/promotions/[id] — end promotion early (sets end_date = NOW())
export async function PATCH(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const sellerId = await getSellerId();
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  // Verify ownership + ensure it is currently active (not already ended)
  const { rows } = await pool.query(
    `SELECT id, end_date FROM promotions WHERE id = $1 AND seller_id = $2`,
    [id, sellerId],
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
  }
  if (new Date(rows[0].end_date) <= new Date()) {
    return NextResponse.json({ error: 'Promotion has already ended' }, { status: 400 });
  }

  const { rows: updated } = await pool.query(
    `UPDATE promotions SET end_date = NOW()
     WHERE id = $1 AND seller_id = $2
     RETURNING id, end_date::text`,
    [id, sellerId],
  );

  return NextResponse.json({ ok: true, promotion: updated[0] });
}

// DELETE /api/promotions/[id] — delete a promotion (only if it hasn't started yet)
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const sellerId = await getSellerId();
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT id, start_date FROM promotions WHERE id = $1 AND seller_id = $2`,
    [id, sellerId],
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
  }
  if (new Date(rows[0].start_date) <= new Date()) {
    return NextResponse.json(
      { error: 'Cannot delete a promotion that has already started. Use "End early" instead.' },
      { status: 400 },
    );
  }

  await pool.query(`DELETE FROM promotions WHERE id = $1 AND seller_id = $2`, [id, sellerId]);
  return NextResponse.json({ ok: true });
}
