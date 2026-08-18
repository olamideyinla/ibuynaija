import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getBuyerId, getSellerId } from '@/lib/cookie';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/bookings/[id] — buyer or provider
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const [buyerId, sellerId] = await Promise.all([getBuyerId(), getSellerId()]);

  if (!buyerId && !sellerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT
       b.id,
       b.provider_id,
       b.service_id,
       b.buyer_id,
       b.requested_datetime,
       b.status,
       b.quote_requested,
       b.confirmed_price,
       b.provider_note,
       b.notes,
       b.address,
       b.date_created,
       b.date_updated,
       so.name     AS service_name,
       so.price_type,
       so.price    AS service_price,
       so.duration_minutes,
       so.location_type,
       s.business_name AS provider_name,
       s.slug          AS provider_slug,
       s.state         AS provider_state,
       s.city_area     AS provider_city,
       s.verified_status AS provider_verified
     FROM bookings b
     JOIN service_offerings so ON so.id = b.service_id
     JOIN sellers           s  ON s.id  = b.provider_id
     WHERE b.id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const r = rows[0];

  if (r.buyer_id !== buyerId && r.provider_id !== sellerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const booking = {
    id:                 r.id,
    provider_id:        r.provider_id,
    service_id:         r.service_id,
    buyer_id:           r.buyer_id,
    requested_datetime: r.requested_datetime,
    status:             r.status,
    quote_requested:    r.quote_requested,
    confirmed_price:    r.confirmed_price != null ? parseFloat(r.confirmed_price) : null,
    provider_note:      r.provider_note,
    notes:              r.notes,
    address:            r.address,
    date_created:       r.date_created,
    date_updated:       r.date_updated,
    service: {
      name:             r.service_name,
      price_type:       r.price_type,
      price:            r.service_price != null ? parseFloat(r.service_price) : null,
      duration_minutes: r.duration_minutes,
      location_type:    r.location_type,
    },
    provider: {
      business_name:  r.provider_name,
      slug:           r.provider_slug,
      state:          r.provider_state,
      city_area:      r.provider_city,
      verified_status: r.provider_verified,
    },
  };

  return NextResponse.json({ booking });
}
