import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getBuyerId } from '@/lib/cookie';
import { emailNewBookingProvider } from '@/lib/email';

// POST /api/bookings — buyer creates a booking request (always status=requested)
export async function POST(req: NextRequest) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: {
    service_id?: string;
    requested_datetime?: string;   // ISO string; required for fixed-price services
    preferred_date?: string;       // YYYY-MM-DD; used for quote services
    notes?: string;
    address?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { service_id, requested_datetime, preferred_date, notes, address } = body;

  if (!service_id) {
    return NextResponse.json({ error: 'service_id required' }, { status: 400 });
  }

  // Fetch service + provider_id + price_type
  const { rows: svcRows } = await pool.query(
    `SELECT so.id, so.provider_id, so.price_type, so.status
     FROM service_offerings so
     WHERE so.id = $1`,
    [service_id],
  );
  if (svcRows.length === 0) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }
  const svc = svcRows[0];
  if (svc.status !== 'active') {
    return NextResponse.json({ error: 'Service is not currently available' }, { status: 400 });
  }

  // Resolve the datetime to store
  let bookingDatetime: string;

  if (svc.price_type === 'fixed') {
    // Fixed-price: buyer must supply an available slot datetime
    if (!requested_datetime) {
      return NextResponse.json({ error: 'requested_datetime required for fixed-price services' }, { status: 400 });
    }
    const parsed = new Date(requested_datetime);
    if (isNaN(parsed.getTime()) || parsed <= new Date()) {
      return NextResponse.json({ error: 'requested_datetime must be a valid future datetime' }, { status: 400 });
    }
    bookingDatetime = parsed.toISOString();
  } else {
    // Quote: use preferred_date if supplied, else default to 7 days from now
    if (preferred_date) {
      const parsed = new Date(preferred_date + 'T12:00:00');
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'preferred_date must be a valid date (YYYY-MM-DD)' }, { status: 400 });
      }
      bookingDatetime = parsed.toISOString();
    } else {
      const sevenDays = new Date();
      sevenDays.setDate(sevenDays.getDate() + 7);
      bookingDatetime = sevenDays.toISOString();
    }

    if (!notes?.trim()) {
      return NextResponse.json({ error: 'notes (job description) required for quote services' }, { status: 400 });
    }
  }

  // Insert booking — status is always 'requested', enforced by DB default + constraint
  const { rows: insertRows } = await pool.query(
    `INSERT INTO bookings
       (provider_id, service_id, buyer_id, requested_datetime,
        quote_requested, notes, address, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'requested')
     RETURNING id, status, quote_requested, date_created`,
    [
      svc.provider_id,
      service_id,
      buyerId,
      bookingDatetime,
      svc.price_type === 'quote',
      notes ?? null,
      address ?? null,
    ],
  );

  const booking = insertRows[0];

  // Notify provider of the new booking request (fire-and-forget, after INSERT)
  pool.query(
    `SELECT so.title, s.business_name, u.email, u.phone
     FROM service_offerings so
     JOIN sellers s ON s.id = so.provider_id
     LEFT JOIN users u ON u.id = s.user_id
     WHERE so.id = $1`,
    [service_id],
  ).then(({ rows }) => {
    if (rows.length === 0 || !rows[0].email) return;
    emailNewBookingProvider({
      providerEmail: rows[0].email,
      providerName: rows[0].business_name,
      bookingId: booking.id,
      serviceName: rows[0].title,
      buyerPhone: rows[0].phone ?? 'not provided',
      requestedDatetime: bookingDatetime,
    }).catch((err) => console.error('[email] new-booking provider notify:', err));
  }).catch((err) => console.error('[email] provider notify query error:', err));

  return NextResponse.json({ booking }, { status: 201 });
}
