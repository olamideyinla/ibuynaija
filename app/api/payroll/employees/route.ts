/**
 * GET  /api/payroll/employees  — list the seller's employees
 * POST /api/payroll/employees  — create an employee
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { parseEmployeeBody } from '@/lib/payroll/employee-form';

async function sellerId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SELLER_COOKIE)?.value ?? null;
}

export async function GET() {
  const seller = await sellerId();
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT * FROM payroll_employees WHERE seller_id = $1 ORDER BY active DESC, name`,
    [seller],
  );
  return NextResponse.json({ employees: rows });
}

export async function POST(request: Request) {
  const seller = await sellerId();
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseEmployeeBody(b);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const f = parsed.fields;

  const { rows } = await pool.query(
    `INSERT INTO payroll_employees
       (seller_id, name, salary_type, gross_monthly_salary, daily_rate, salary_structure,
        tax_id, annual_rent_paid, pension_applicable, nhf_applicable, nhis_applicable,
        life_insurance_premium, bank_name, bank_account_number, start_date)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING id`,
    [
      seller, f.name, f.salary_type, f.gross_monthly_salary, f.daily_rate,
      JSON.stringify(f.salary_structure), f.tax_id, f.annual_rent_paid,
      f.pension_applicable, f.nhf_applicable, f.nhis_applicable, f.life_insurance_premium,
      f.bank_name, f.bank_account_number, f.start_date,
    ],
  );

  return NextResponse.json({ ok: true, id: rows[0].id }, { status: 201 });
}
