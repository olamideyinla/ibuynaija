import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/expenses/[id] — edit any field freely
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
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

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if ('amount' in body) {
    const amount = Number(body.amount);
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    sets.push(`amount = $${idx++}`);
    values.push(amount);
  }

  if ('date' in body) {
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
    }
    sets.push(`date = $${idx++}`);
    values.push(date);
  }

  if ('category' in body) {
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    if (!category) {
      return NextResponse.json({ error: 'category cannot be empty' }, { status: 400 });
    }
    sets.push(`category = $${idx++}`);
    values.push(category);
  }

  if ('note' in body) {
    const note = typeof body.note === 'string' ? body.note.trim() || null : null;
    sets.push(`note = $${idx++}`);
    values.push(note);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  values.push(id, sellerId);
  const { rows: [expense] } = await pool.query(
    `UPDATE expenses
     SET ${sets.join(', ')}
     WHERE id = $${idx++} AND seller_id = $${idx}
     RETURNING id, amount::float, date::text, category, note`,
    values,
  );

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, expense });
}

// DELETE /api/expenses/[id]
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const sellerId = await getSellerId();
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  const { rowCount } = await pool.query(
    `DELETE FROM expenses WHERE id = $1 AND seller_id = $2`,
    [id, sellerId],
  );

  if (rowCount === 0) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
