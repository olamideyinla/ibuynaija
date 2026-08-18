import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

const VALID_REASONS = ['not_made_in_nigeria', 'counterfeit', 'inappropriate'];

interface Params { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  let body: { reason?: string; details?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { reason, details } = body;
  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: `reason must be one of: ${VALID_REASONS.join(', ')}` }, { status: 400 });
  }

  // Verify listing exists and is active
  const { rows } = await pool.query('SELECT id FROM listings WHERE id = $1 AND status = $2', [id, 'active']);
  if (rows.length === 0) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  await pool.query(
    `INSERT INTO listing_reports (listing_id, reason, details) VALUES ($1, $2, $3)`,
    [id, reason, details ?? null],
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
