/**
 * POST /api/payroll/runs/[id]/approve  — approve a draft run
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { approvePayrollRun } from '@/lib/payroll/runner';

interface Ctx { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Ctx) {
  const store = await cookies();
  const seller = store.get(SELLER_COOKIE)?.value ?? null;
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;

  // Record the seller's business name as the approver.
  const { rows } = await pool.query(`SELECT business_name FROM sellers WHERE id = $1`, [seller]);
  const approver = rows[0]?.business_name ?? 'Seller';

  try {
    await approvePayrollRun(seller, id, approver);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to approve run';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
