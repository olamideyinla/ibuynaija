import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';

// GET /api/services?category=<slug>&q=<search>&limit=24&offset=0
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') ?? '';
  const q        = searchParams.get('q') ?? '';
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '24', 10), 96);
  const offset   = parseInt(searchParams.get('offset') ?? '0', 10);

  let whereClause = `WHERE so.status = 'active'`;
  const params: unknown[] = [];

  if (category) {
    params.push(category);
    whereClause += ` AND c.slug = $${params.length}`;
  }

  if (q) {
    params.push(q);
    const idx = params.length;
    whereClause += ` AND (
      so.search_vector @@ plainto_tsquery('english', $${idx})
      OR so.name ILIKE $${idx + 1}
    )`;
    params.push(`%${q}%`);
  }

  params.push(limit);
  params.push(offset);
  const limitIdx  = params.length - 1;
  const offsetIdx = params.length;

  const sql = `
    SELECT
      so.id,
      so.name,
      so.description,
      so.price_type,
      so.price,
      so.price_from,
      so.duration_minutes,
      so.location_type,
      so.photos,
      so.date_created,
      c.name  AS category_name,
      c.slug  AS category_slug,
      s.id    AS provider_id,
      s.slug  AS provider_slug,
      s.business_name,
      s.state,
      s.city_area,
      s.verified_status,
      s.logo_photo_url
    FROM service_offerings so
    JOIN sellers    s ON s.id = so.provider_id
    JOIN categories c ON c.id = so.category_id
    ${whereClause}
    ORDER BY s.verified_status DESC, so.date_created DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const { rows } = await pool.query(sql, params);

  const services = rows.map((r) => ({
    id:               r.id,
    name:             r.name,
    description:      r.description,
    price_type:       r.price_type,
    price:            r.price != null ? parseFloat(r.price) : null,
    price_from:       r.price_from != null ? parseFloat(r.price_from) : null,
    duration_minutes: r.duration_minutes,
    location_type:    r.location_type,
    photos:           r.photos,
    date_created:     r.date_created,
    category_name:    r.category_name,
    category_slug:    r.category_slug,
    provider: {
      id:             r.provider_id,
      slug:           r.provider_slug,
      business_name:  r.business_name,
      state:          r.state,
      city_area:      r.city_area,
      verified_status: r.verified_status,
      logo_photo_url: r.logo_photo_url,
    },
  }));

  return NextResponse.json({ services });
}

// POST /api/services — seller creates a new service offering
export async function POST(req: NextRequest) {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

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
    price_type = 'fixed', price = null, price_from = null,
    duration_minutes = null, location_type = 'at_provider',
    photos = [], status = 'active',
    schedules = [],
  } = body;

  if (!name?.trim())        return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
  if (!category_id)         return NextResponse.json({ error: 'Category is required' }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  if (!['fixed', 'quote'].includes(price_type))
    return NextResponse.json({ error: 'Invalid price type' }, { status: 400 });
  if (price_type === 'fixed' && (price == null || price < 0))
    return NextResponse.json({ error: 'Price is required for fixed-price services' }, { status: 400 });
  if (!['at_provider', 'provider_travels'].includes(location_type))
    return NextResponse.json({ error: 'Invalid location type' }, { status: 400 });

  // Verify category exists
  const { rows: catRows } = await pool.query('SELECT id FROM categories WHERE id = $1', [category_id]);
  if (!catRows.length) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [svc] } = await client.query(
      `INSERT INTO service_offerings
         (provider_id, name, category_id, description, price_type, price, price_from,
          duration_minutes, location_type, photos, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        sellerId, name.trim(), category_id, description.trim(),
        price_type, price_type === 'fixed' ? price : null, price_from ?? null,
        duration_minutes ?? null, location_type,
        photos, status,
      ],
    );

    // Insert availability schedules
    for (const s of schedules) {
      if (s.start_time && s.end_time) {
        await client.query(
          `INSERT INTO availability_schedules (service_id, day_of_week, start_time, end_time)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (service_id, day_of_week) DO UPDATE
             SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time`,
          [svc.id, s.day_of_week, s.start_time, s.end_time],
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ id: svc.id }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /api/services]', err);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  } finally {
    client.release();
  }
}
