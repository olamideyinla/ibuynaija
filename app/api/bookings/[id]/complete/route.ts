import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/bookings/[id]/complete — provider marks booking as completed or no_show
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const sellerId = await getSellerId();

  if (!sellerId) {
    return NextResponse.json({ error: 'Provider authentication required' }, { status: 401 });
  }

  let body: { outcome?: string; provider_note?: string } = {};
  try {
    body = await req.json();
  } catch {
    // use defaults
  }

  const outcome = body.outcome ?? 'completed';
  if (!['completed', 'no_show'].includes(outcome)) {
    return NextResponse.json(
      { error: 'outcome must be "completed" or "no_show"' },
      { status: 400 },
    );
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

  if (booking.status !== 'confirmed') {
    return NextResponse.json(
      { error: `Can only close a booking that is "confirmed"; current status is "${booking.status}"` },
      { status: 400 },
    );
  }

  await pool.query(
    `UPDATE bookings
     SET status        = $1,
         provider_note = COALESCE($2, provider_note)
     WHERE id = $3`,
    [outcome, body.provider_note ?? null, id],
  );

  return NextResponse.json({ ok: true, status: outcome });
}
