import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Compute the next <count> available dates from today given schedules and blocked dates.
function computeAvailableSlots(
  schedules: { day_of_week: number; start_time: string; end_time: string }[],
  blockedDates: Set<string>,
  count = 14,
): { date: string; day_label: string; start_time: string; end_time: string }[] {
  const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const scheduleMap = new Map(schedules.map((s) => [s.day_of_week, s]));
  const slots: { date: string; day_label: string; start_time: string; end_time: string }[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from tomorrow
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() + 1);

  // Scan up to 90 days ahead to find <count> slots
  for (let i = 0; i < 90 && slots.length < count; i++) {
    const dow = cursor.getDay();
    const sched = scheduleMap.get(dow);
    if (sched) {
      const dateStr = cursor.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!blockedDates.has(dateStr)) {
        slots.push({
          date: dateStr,
          day_label: DAY_LABELS[dow],
          start_time: sched.start_time,
          end_time: sched.end_time,
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return slots;
}

// GET /api/services/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const { rows } = await pool.query(
    `SELECT
       so.id,
       so.name,
       so.description,
       so.price_type,
       so.price,
       so.price_from,
       so.duration_minutes,
       so.location_type,
       so.photos,
       so.status,
       so.date_created,
       c.name  AS category_name,
       c.slug  AS category_slug,
       s.id    AS provider_id,
       s.slug  AS provider_slug,
       s.business_name,
       s.tagline,
       s.description AS provider_description,
       s.state,
       s.city_area,
       s.verified_status,
       s.logo_photo_url,
       s.date_created AS provider_since
     FROM service_offerings so
     JOIN sellers    s ON s.id = so.provider_id
     JOIN categories c ON c.id = so.category_id
     WHERE so.id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const r = rows[0];

  // Fetch availability schedules
  const { rows: schedRows } = await pool.query(
    `SELECT day_of_week, start_time::text, end_time::text
     FROM availability_schedules
     WHERE service_id = $1
     ORDER BY day_of_week`,
    [id],
  );

  // Fetch blocked dates (next 90 days only)
  const { rows: blockRows } = await pool.query(
    `SELECT blocked_date::text AS blocked_date
     FROM availability_blocks
     WHERE service_id = $1 AND blocked_date >= CURRENT_DATE
     ORDER BY blocked_date`,
    [id],
  );

  const blockedSet = new Set<string>(blockRows.map((b) => b.blocked_date));
  const available_slots = r.price_type === 'fixed'
    ? computeAvailableSlots(schedRows, blockedSet)
    : [];

  const service = {
    id:               r.id,
    name:             r.name,
    description:      r.description,
    price_type:       r.price_type,
    price:            r.price != null ? parseFloat(r.price) : null,
    price_from:       r.price_from != null ? parseFloat(r.price_from) : null,
    duration_minutes: r.duration_minutes,
    location_type:    r.location_type,
    photos:           r.photos,
    status:           r.status,
    date_created:     r.date_created,
    category_name:    r.category_name,
    category_slug:    r.category_slug,
    provider: {
      id:                   r.provider_id,
      slug:                 r.provider_slug,
      business_name:        r.business_name,
      tagline:              r.tagline,
      description:          r.provider_description,
      state:                r.state,
      city_area:            r.city_area,
      verified_status:      r.verified_status,
      logo_photo_url:       r.logo_photo_url,
      since:                r.provider_since,
    },
  };

  return NextResponse.json({
    service,
    schedules: schedRows,
    blocked_dates: blockRows.map((b) => b.blocked_date),
    available_slots,
  });
}

// PATCH /api/services/[id] — seller updates their service
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const { rows: own } = await pool.query(
    'SELECT id FROM service_offerings WHERE id = $1 AND provider_id = $2',
    [id, sellerId],
  );
  if (!own.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: {
    name?: string; category_id?: string; description?: string;
    price_type?: string; price?: number | null; price_from?: number | null;
    duration_minutes?: number | null; location_type?: string;
    photos?: string[]; status?: string;
    schedules?: { day_of_week: number; start_time: string; end_time: string }[];
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    name, category_id, description,
    price_type, price, price_from,
    duration_minutes, location_type,
    photos, status,
    schedules,
  } = body;

  if (name !== undefined && !name.trim())
    return NextResponse.json({ error: 'Service name cannot be empty' }, { status: 400 });
  if (price_type === 'fixed' && (price == null || price < 0))
    return NextResponse.json({ error: 'Price is required for fixed-price services' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE service_offerings SET
         name             = COALESCE($2, name),
         category_id      = COALESCE($3, category_id),
         description      = COALESCE($4, description),
         price_type       = COALESCE($5, price_type),
         price            = CASE WHEN $5 = 'fixed' THEN $6 WHEN $5 = 'quote' THEN NULL ELSE price END,
         price_from       = COALESCE($7, price_from),
         duration_minutes = COALESCE($8, duration_minutes),
         location_type    = COALESCE($9, location_type),
         photos           = COALESCE($10, photos),
         status           = COALESCE($11, status)
       WHERE id = $1`,
      [
        id,
        name?.trim() ?? null, category_id ?? null, description?.trim() ?? null,
        price_type ?? null, price ?? null, price_from ?? null,
        duration_minutes ?? null, location_type ?? null,
        photos ?? null, status ?? null,
      ],
    );

    // Replace schedules if provided
    if (schedules !== undefined) {
      await client.query('DELETE FROM availability_schedules WHERE service_id = $1', [id]);
      for (const s of schedules) {
        if (s.start_time && s.end_time) {
          await client.query(
            `INSERT INTO availability_schedules (service_id, day_of_week, start_time, end_time)
             VALUES ($1, $2, $3, $4)`,
            [id, s.day_of_week, s.start_time, s.end_time],
          );
        }
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PATCH /api/services/[id]]', err);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE /api/services/[id] — seller deletes their service
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const { rows: own } = await pool.query(
    'SELECT id FROM service_offerings WHERE id = $1 AND provider_id = $2',
    [id, sellerId],
  );
  if (!own.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Block deletion if there are active bookings
  const { rows: active } = await pool.query(
    `SELECT COUNT(*) AS n FROM bookings
     WHERE service_id = $1 AND status IN ('requested','confirmed')`,
    [id],
  );
  if (parseInt(active[0].n) > 0)
    return NextResponse.json(
      { error: 'This service has active bookings. Please resolve them before deleting.' },
      { status: 409 },
    );

  await pool.query('DELETE FROM service_offerings WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
