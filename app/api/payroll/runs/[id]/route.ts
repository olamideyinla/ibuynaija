/**
 * DELETE /api/payroll/runs/[id]  — delete a draft run (cascades payslips + remittances)
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SELLER_COOKIE } from '@/lib/cookie';
import { deleteDraftRun } from '@/lib/payroll/runner';

interface Ctx { params: Promise<{ id: string }> }

export async function DELETE(_request: Request, { params }: Ctx) {
  const store = await cookies();
  const seller = store.get(SELLER_COOKIE)?.value ?? null;
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;

  try {
    await deleteDraftRun(seller, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete run';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
