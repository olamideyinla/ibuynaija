import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { BUYER_COOKIE, SELLER_COOKIE } from '@/lib/cookie';
import { getAdminSession } from '@/lib/admin-auth';

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { threadId } = await params;

  const store        = await cookies();
  const buyerId      = store.get(BUYER_COOKIE)?.value  ?? null;
  const sellerId     = store.get(SELLER_COOKIE)?.value ?? null;
  const adminSession = await getAdminSession();

  const { rows: [thread] } = await pool.query(
    'SELECT id, context_type, context_id, buyer_id, seller_id, date_created FROM message_threads WHERE id = $1',
    [threadId],
  );

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });

  const isParticipant =
    (buyerId  && thread.buyer_id  === buyerId)  ||
    (sellerId && thread.seller_id === sellerId);

  if (!isParticipant && !adminSession) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { rows: messages } = await pool.query(
    `SELECT id, sender_type, body, date_sent
     FROM messages
     WHERE thread_id = $1
     ORDER BY date_sent ASC`,
    [threadId],
  );

  return NextResponse.json({ thread, messages });
}
