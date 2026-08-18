/**
 * POST /api/payroll/runs/[id]/pay  — mark an approved run as paid
 * (records the total employer cost as a labour expense for the seller)
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SELLER_COOKIE } from '@/lib/cookie';
import { markPayrollPaid } from '@/lib/payroll/runner';

interface Ctx { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Ctx) {
  const store = await cookies();
  const seller = store.get(SELLER_COOKIE)?.value ?? null;
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;

  try {
    await markPayrollPaid(seller, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark run as paid';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
