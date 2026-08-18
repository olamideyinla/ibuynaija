import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

const VALID_REASONS = ['fake', 'inappropriate', 'spam'];

interface Params { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  let body: { reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { reason } = body;
  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: `reason must be one of: ${VALID_REASONS.join(', ')}` }, { status: 400 });
  }

  // Verify rating exists and is not already reported
  const { rows } = await pool.query('SELECT id FROM ratings WHERE id = $1', [id]);
  if (rows.length === 0) return NextResponse.json({ error: 'Rating not found' }, { status: 404 });

  // Allow duplicate reports — each is a separate signal for the admin queue
  await pool.query(
    `INSERT INTO rating_reports (rating_id, reason) VALUES ($1, $2)`,
    [id, reason],
  );

  // Flag the rating as reported
  await pool.query(`UPDATE ratings SET reported = true WHERE id = $1`, [id]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
