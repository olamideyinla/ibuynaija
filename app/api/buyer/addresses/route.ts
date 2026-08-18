import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getBuyerId } from '@/lib/cookie';

const MAX_ADDRESSES = 5;

// GET /api/buyer/addresses — return the saved address list
export async function GET() {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT COALESCE(saved_delivery_addresses, '{}') AS addresses FROM users WHERE id = $1`,
    [buyerId],
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ addresses: rows[0].addresses as string[] });
}

// POST /api/buyer/addresses — append a new address
export async function POST(req: NextRequest) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const address = body.address?.trim();
  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }

  // Append, keeping at most MAX_ADDRESSES entries (drop oldest if at cap)
  const { rows } = await pool.query(
    `UPDATE users
     SET saved_delivery_addresses = (
       CASE
         WHEN array_length(COALESCE(saved_delivery_addresses, '{}'), 1) >= $2
           THEN (COALESCE(saved_delivery_addresses, '{}'))[2:] || ARRAY[$1]
         ELSE COALESCE(saved_delivery_addresses, '{}') || ARRAY[$1]
       END
     )
     WHERE id = $3
     RETURNING saved_delivery_addresses AS addresses`,
    [address, MAX_ADDRESSES, buyerId],
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ addresses: rows[0].addresses as string[] }, { status: 201 });
}
