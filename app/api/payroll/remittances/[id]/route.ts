/**
 * PATCH /api/payroll/remittances/[id]  — mark a remittance obligation as remitted
 * Body: { reference?: string }
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const store = await cookies();
  const seller = store.get(SELLER_COOKIE)?.value ?? null;
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;

  let b: { reference?: unknown } = {};
  try { b = await request.json(); } catch { /* reference optional */ }
  const reference = typeof b.reference === 'string' && b.reference.trim() ? b.reference.trim() : null;

  const { rows, rowCount } = await pool.query(
    `UPDATE remittance_obligations
       SET status = 'remitted', remitted_date = CURRENT_DATE,
           remitted_amount = total_amount, remitted_reference = $1, updated_at = NOW()
     WHERE id = $2 AND seller_id = $3 AND status <> 'remitted'
     RETURNING id`,
    [reference, id, seller],
  );
  if (rowCount === 0) {
    return NextResponse.json({ error: 'Remittance not found or already remitted' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, id: rows[0].id });
}
