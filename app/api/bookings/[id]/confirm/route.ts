import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';
import { emailBookingConfirmedBuyer } from '@/lib/email';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/bookings/[id]/confirm — provider confirms a requested booking
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const sellerId = await getSellerId();

  if (!sellerId) {
    return NextResponse.json({ error: 'Provider authentication required' }, { status: 401 });
  }

  let body: {
    confirmed_price?: number;
    confirmed_datetime?: string;  // optional — overrides requested_datetime if provided
    provider_note?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    // all fields optional
  }

  // Fetch booking
  const { rows } = await pool.query(
    `SELECT b.id, b.provider_id, b.status, b.quote_requested
     FROM bookings b
     WHERE b.id = $1`,
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
      { error: `Cannot confirm a booking with status "${booking.status}"` },
      { status: 400 },
    );
  }

  // Quote bookings must have a confirmed_price
  if (booking.quote_requested && (body.confirmed_price == null || isNaN(Number(body.confirmed_price)))) {
    return NextResponse.json(
      { error: 'confirmed_price is required when confirming a quote booking' },
      { status: 400 },
    );
  }

  // Optionally update the datetime if provider reschedules
  let newDatetime: string | null = null;
  if (body.confirmed_datetime) {
    const parsed = new Date(body.confirmed_datetime);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'confirmed_datetime must be a valid datetime' }, { status: 400 });
    }
    newDatetime = parsed.toISOString();
  }

  await pool.query(
    `UPDATE bookings
     SET status          = 'confirmed',
         confirmed_price = COALESCE($1, confirmed_price),
         provider_note   = COALESCE($2, provider_note),
         requested_datetime = COALESCE($3::timestamptz, requested_datetime)
     WHERE id = $4`,
    [
      body.confirmed_price ?? null,
      body.provider_note ?? null,
      newDatetime,
      id,
    ],
  );

  // Notify buyer that their booking has been confirmed (fire-and-forget)
  pool.query(
    `SELECT b.buyer_id, b.requested_datetime, b.confirmed_price,
            so.title AS service_name, s.business_name,
            u.email AS buyer_email
     FROM bookings b
     JOIN service_offerings so ON so.id = b.service_id
     JOIN sellers s ON s.id = b.provider_id
     LEFT JOIN users u ON u.id = b.buyer_id
     WHERE b.id = $1`,
    [id],
  ).then(({ rows }) => {
    if (rows.length === 0 || !rows[0].buyer_email) return;
    emailBookingConfirmedBuyer({
      buyerEmail: rows[0].buyer_email,
      bookingId: id,
      serviceName: rows[0].service_name,
      providerName: rows[0].business_name,
      confirmedDatetime: newDatetime ?? rows[0].requested_datetime,
      confirmedPrice: rows[0].confirmed_price ?? undefined,
    }).catch((err) => console.error('[email] booking-confirmed buyer notify:', err));
  }).catch((err) => console.error('[email] booking confirm query error:', err));

  return NextResponse.json({ ok: true, status: 'confirmed' });
}
