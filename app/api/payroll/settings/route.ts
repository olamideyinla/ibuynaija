/**
 * GET  /api/payroll/settings  — read the seller's payroll settings
 * PUT  /api/payroll/settings  — create or update them (one row per seller)
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';

async function sellerId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SELLER_COOKIE)?.value ?? null;
}

export async function GET() {
  const seller = await sellerId();
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT * FROM payroll_settings WHERE seller_id = $1`,
    [seller],
  );
  return NextResponse.json({ settings: rows[0] ?? null });
}

export async function PUT(request: Request) {
  const seller = await sellerId();
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payDay = Number(b.pay_day ?? 25);
  if (!Number.isInteger(payDay) || payDay < 1 || payDay > 28) {
    return NextResponse.json({ error: 'Pay day must be a whole number between 1 and 28' }, { status: 400 });
  }
  const orNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  await pool.query(
    `INSERT INTO payroll_settings
       (seller_id, is_registered_employer, employer_tax_id, pension_enrolled, pfa_name,
        pfa_account_number, state_of_operation, nhf_enrolled, nhis_enrolled, pay_day)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (seller_id) DO UPDATE SET
       is_registered_employer = EXCLUDED.is_registered_employer,
       employer_tax_id        = EXCLUDED.employer_tax_id,
       pension_enrolled       = EXCLUDED.pension_enrolled,
       pfa_name               = EXCLUDED.pfa_name,
       pfa_account_number     = EXCLUDED.pfa_account_number,
       state_of_operation     = EXCLUDED.state_of_operation,
       nhf_enrolled           = EXCLUDED.nhf_enrolled,
       nhis_enrolled          = EXCLUDED.nhis_enrolled,
       pay_day                = EXCLUDED.pay_day,
       updated_at             = NOW()`,
    [
      seller,
      Boolean(b.is_registered_employer),
      orNull(b.employer_tax_id),
      b.pension_enrolled === undefined ? true : Boolean(b.pension_enrolled),
      orNull(b.pfa_name),
      orNull(b.pfa_account_number),
      orNull(b.state_of_operation),
      Boolean(b.nhf_enrolled),
      Boolean(b.nhis_enrolled),
      payDay,
    ],
  );

  return NextResponse.json({ ok: true });
}
