/**
 * PATCH  /api/payroll/employees/[id]  — update an employee
 * DELETE /api/payroll/employees/[id]  — deactivate (soft) or hard-delete an employee
 *
 * Employees referenced by an existing payroll run are deactivated (active=false)
 * rather than deleted, to preserve payslip history; unused ones are removed.
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

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const seller = await sellerId();
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseEmployeeBody(b);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const f = parsed.fields;
  const active = b.active === undefined ? true : Boolean(b.active);

  const { rowCount } = await pool.query(
    `UPDATE payroll_employees SET
       name = $1, salary_type = $2, gross_monthly_salary = $3, daily_rate = $4,
       salary_structure = $5::jsonb, tax_id = $6, annual_rent_paid = $7,
       pension_applicable = $8, nhf_applicable = $9, nhis_applicable = $10,
       life_insurance_premium = $11, bank_name = $12, bank_account_number = $13,
       start_date = $14, active = $15, updated_at = NOW()
     WHERE id = $16 AND seller_id = $17`,
    [
      f.name, f.salary_type, f.gross_monthly_salary, f.daily_rate,
      JSON.stringify(f.salary_structure), f.tax_id, f.annual_rent_paid,
      f.pension_applicable, f.nhf_applicable, f.nhis_applicable, f.life_insurance_premium,
      f.bank_name, f.bank_account_number, f.start_date, active, id, seller,
    ],
  );
  if (rowCount === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const seller = await sellerId();
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;

  // If the employee appears on any payslip, keep the record and just deactivate.
  const { rows: used } = await pool.query(
    `SELECT 1 FROM payslip_records WHERE employee_id = $1 LIMIT 1`,
    [id],
  );

  if (used.length > 0) {
    const { rowCount } = await pool.query(
      `UPDATE payroll_employees SET active = FALSE, updated_at = NOW()
       WHERE id = $1 AND seller_id = $2`,
      [id, seller],
    );
    if (rowCount === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    return NextResponse.json({ ok: true, deactivated: true });
  }

  const { rowCount } = await pool.query(
    `DELETE FROM payroll_employees WHERE id = $1 AND seller_id = $2`,
    [id, seller],
  );
  if (rowCount === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
