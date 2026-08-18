import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';

// GET /api/expenses — list seller's expenses (recent 100)
export async function GET(_req: NextRequest) {
  const sellerId = await getSellerId();
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  const { rows } = await pool.query(
    `SELECT id, seller_id, amount::float, date::text, category, note, date_created::text
     FROM expenses
     WHERE seller_id = $1
     ORDER BY date DESC, date_created DESC
     LIMIT 100`,
    [sellerId],
  );

  return NextResponse.json({ expenses: rows });
}

// POST /api/expenses — log a new expense
// Body: { amount, date, category, note? }
export async function POST(req: NextRequest) {
  const sellerId = await getSellerId();
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  let body: { amount?: unknown; date?: unknown; category?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  const date = typeof body.date === 'string' ? body.date.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }

  const category = typeof body.category === 'string' ? body.category.trim() : '';
  if (!category) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 });
  }

  const note = typeof body.note === 'string' ? body.note.trim() || null : null;

  const { rows: [expense] } = await pool.query(
    `INSERT INTO expenses (seller_id, amount, date, category, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, seller_id, amount::float, date::text, category, note, date_created::text`,
    [sellerId, amount, date, category, note],
  );

  return NextResponse.json({ ok: true, expense }, { status: 201 });
}
