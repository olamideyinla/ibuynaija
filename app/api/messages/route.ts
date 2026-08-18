import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { BUYER_COOKIE, SELLER_COOKIE } from '@/lib/cookie';

export async function POST(req: NextRequest) {
  const store = await cookies();
  const buyerId  = store.get(BUYER_COOKIE)?.value  ?? null;
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;

  if (!buyerId && !sellerId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  let body_json: { context_type?: unknown; context_id?: unknown; body?: unknown };
  try {
    body_json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { context_type, context_id, body } = body_json;

  if (context_type !== 'order' && context_type !== 'enquiry') {
    return NextResponse.json({ error: 'context_type must be "order" or "enquiry"' }, { status: 400 });
  }
  if (!context_id || typeof context_id !== 'string') {
    return NextResponse.json({ error: 'context_id required' }, { status: 400 });
  }
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return NextResponse.json({ error: 'body must be a non-empty string' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // Resolve buyer_id / seller_id from the context
    let threadBuyerId: string;
    let threadSellerId: string;

    if (context_type === 'order') {
      const { rows } = await client.query(
        'SELECT buyer_id, seller_id FROM orders WHERE id = $1',
        [context_id],
      );
      if (rows.length === 0) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      threadBuyerId  = rows[0].buyer_id;
      threadSellerId = rows[0].seller_id;
    } else {
      // enquiry: seller_id comes through listings
      const { rows } = await client.query(
        `SELECT e.buyer_id, l.seller_id
         FROM enquiries e
         JOIN listings l ON l.id = e.listing_id
         WHERE e.id = $1`,
        [context_id],
      );
      if (rows.length === 0) return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
      threadBuyerId  = rows[0].buyer_id;
      threadSellerId = rows[0].seller_id;
    }

    // Authorise: sender must be one of the two parties
    let senderType: 'buyer' | 'seller';
    let senderId: string;

    if (buyerId && threadBuyerId === buyerId) {
      senderType = 'buyer';
      senderId   = buyerId;
    } else if (sellerId && threadSellerId === sellerId) {
      senderType = 'seller';
      senderId   = sellerId;
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await client.query('BEGIN');

    // Lazy thread creation — no-op if the thread already exists
    await client.query(
      `INSERT INTO message_threads (context_type, context_id, buyer_id, seller_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (context_type, context_id) DO NOTHING`,
      [context_type, context_id, threadBuyerId, threadSellerId],
    );

    const { rows: [thread] } = await client.query(
      'SELECT id FROM message_threads WHERE context_type = $1 AND context_id = $2',
      [context_type, context_id],
    );

    const { rows: [message] } = await client.query(
      `INSERT INTO messages (thread_id, sender_id, sender_type, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, thread_id, sender_type, body, date_sent`,
      [thread.id, senderId, senderType, body.trim()],
    );

    await client.query('COMMIT');

    return NextResponse.json({ message, thread_id: thread.id }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /api/messages]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
