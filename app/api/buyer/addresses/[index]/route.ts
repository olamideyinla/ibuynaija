import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getBuyerId } from '@/lib/cookie';

interface RouteContext {
  params: Promise<{ index: string }>;
}

// DELETE /api/buyer/addresses/[index] — remove address at 0-based index
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { index: indexStr } = await params;
  const index = parseInt(indexStr, 10);
  if (isNaN(index) || index < 0) {
    return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
  }

  // PostgreSQL arrays are 1-based; convert 0-based JS index → 1-based PG index
  // Use array_cat to reconstruct array without element at position (index+1)
  const { rows } = await pool.query(
    `UPDATE users
     SET saved_delivery_addresses = (
       saved_delivery_addresses[1:$1] || saved_delivery_addresses[$2:]
     )
     WHERE id = $3
       AND array_length(COALESCE(saved_delivery_addresses, '{}'), 1) > $1
     RETURNING saved_delivery_addresses AS addresses`,
    [index, index + 2, buyerId],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  }

  return NextResponse.json({ addresses: rows[0].addresses as string[] });
}
