import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';
import { emailBookingDeclinedBuyer } from '@/lib/email';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/bookings/[id]/decline — provider declines a requested booking
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const sellerId = await getSellerId();

  if (!sellerId) {
    return NextResponse.json({ error: 'Provider authentication required' }, { status: 401 });
  }

  let body: { provider_note?: string } = {};
  try {
    body = await req.json();
  } catch {
    // note is optional
  }

  const { rows } = await pool.query(
    `SELECT id, provider_id, status FROM bookings WHERE id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const booking = rows[0];

  if (booking.provider_id !== sellerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (booking.status !== 'requested') {
    return NextResponse.json(
      { error: `Cannot decline a booking with status "${booking.status}"` },
      { status: 400 },
    );
  }

  await pool.query(
    `UPDATE bookings
     SET status        = 'cancelled',
         provider_note = COALESCE($1, provider_note)
     WHERE id = $2`,
    [body.provider_note ?? null, id],
  );

  // Notify buyer that their booking has been declined (fire-and-forget)
  pool.query(
    `SELECT so.title AS service_name, s.business_name, u.email AS buyer_email
     FROM bookings b
     JOIN service_offerings so ON so.id = b.service_id
     JOIN sellers s ON s.id = b.provider_id
     LEFT JOIN users u ON u.id = b.buyer_id
     WHERE b.id = $1`,
    [id],
  ).then(({ rows }) => {
    if (rows.length === 0 || !rows[0].buyer_email) return;
    emailBookingDeclinedBuyer({
      buyerEmail: rows[0].buyer_email,
      bookingId: id,
      serviceName: rows[0].service_name,
      providerName: rows[0].business_name,
    }).catch((err) => console.error('[email] booking-declined buyer notify:', err));
  }).catch((err) => console.error('[email] booking decline query error:', err));

  return NextResponse.json({ ok: true, status: 'cancelled' });
}
