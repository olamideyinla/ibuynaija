/**
 * POST /api/payroll/run  — run monthly payroll for a period
 * Body: { period: "YYYY-MM", daysWorked?: { [employeeId]: number } }
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SELLER_COOKIE } from '@/lib/cookie';
import { runMonthlyPayroll } from '@/lib/payroll/runner';

export async function POST(request: Request) {
  const store = await cookies();
  const seller = store.get(SELLER_COOKIE)?.value ?? null;
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let b: { period?: unknown; daysWorked?: unknown };
  try { b = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const period = typeof b.period === 'string' ? b.period : '';
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: 'Period must be in YYYY-MM format' }, { status: 400 });
  }

  // Sanitise daysWorked into a plain Record<string, number>
  const daysWorked: Record<string, number> = {};
  if (b.daysWorked && typeof b.daysWorked === 'object' && !Array.isArray(b.daysWorked)) {
    for (const [k, v] of Object.entries(b.daysWorked as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && n <= 31) daysWorked[k] = n;
    }
  }

  try {
    const result = await runMonthlyPayroll(seller, period, daysWorked);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to run payroll';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
