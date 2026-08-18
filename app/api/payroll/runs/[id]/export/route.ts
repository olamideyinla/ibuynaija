/**
 * GET /api/payroll/runs/[id]/export  — download the run summary as CSV
 * (payslip lines + totals, then the statutory remittance obligations).
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import type { PayrollRunRow, PayslipRow, RemittanceRow } from '@/types';

interface Ctx { params: Promise<{ id: string }> }

/** Quote a CSV field only when needed. */
function csv(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function row(cells: (string | number)[]): string {
  return cells.map(csv).join(',');
}
function amountOf(deductions: PayslipRow['deductions'], shortCode: string): number {
  return deductions.filter(d => d.shortCode === shortCode).reduce((s, d) => s + d.amount, 0);
}

export async function GET(_request: Request, { params }: Ctx) {
  const store = await cookies();
  const seller = store.get(SELLER_COOKIE)?.value ?? null;
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await params;

  const { rows: runRows } = await pool.query<PayrollRunRow>(
    `SELECT * FROM payroll_runs WHERE id = $1 AND seller_id = $2`,
    [id, seller],
  );
  if (runRows.length === 0) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  const run = runRows[0];

  const [{ rows: slips }, { rows: remits }] = await Promise.all([
    pool.query<PayslipRow>(
      `SELECT * FROM payslip_records WHERE payroll_run_id = $1 ORDER BY employee_name`, [id]),
    pool.query<RemittanceRow>(
      `SELECT deduction_name, total_amount, remittance_to, status,
              TO_CHAR(due_date, 'YYYY-MM-DD') AS due_date
       FROM remittance_obligations WHERE payroll_run_id = $1 ORDER BY due_date`, [id]),
  ]);

  const lines: string[] = [];
  lines.push(row([`Payroll summary: ${run.period}`]));
  lines.push('');

  // Payslips
  lines.push(row(['Employee', 'Gross Pay', 'PAYE', 'Pension', 'NHF', 'NHIS', 'Other Deductions', 'Total Deductions', 'Net Pay', 'Employer Cost']));
  for (const s of slips) {
    const gross = parseFloat(s.gross_pay);
    const paye = amountOf(s.deductions, 'PAYE');
    const pen = amountOf(s.deductions, 'PEN');
    const nhf = amountOf(s.deductions, 'NHF');
    const nhis = amountOf(s.deductions, 'NHIS');
    const totalDed = parseFloat(s.total_deductions);
    const other = Math.round((totalDed - paye - pen - nhf - nhis) * 100) / 100;
    lines.push(row([
      s.employee_name, gross, paye, pen, nhf, nhis, other, totalDed,
      parseFloat(s.net_pay), parseFloat(s.total_employer_cost),
    ]));
  }
  lines.push(row([
    'TOTAL', parseFloat(run.total_gross_pay), parseFloat(run.total_paye),
    parseFloat(run.total_pension), '', '', '', parseFloat(run.total_employee_deductions),
    parseFloat(run.total_net_pay), parseFloat(run.total_employer_costs),
  ]));

  // Remittances
  lines.push('');
  lines.push(row(['Statutory remittances']));
  lines.push(row(['Deduction', 'Amount', 'Due Date', 'Remit To', 'Status']));
  for (const r of remits) {
    lines.push(row([r.deduction_name, parseFloat(r.total_amount), r.due_date, r.remittance_to, r.status]));
  }

  const body = '﻿' + lines.join('\r\n'); // BOM so Excel reads UTF-8/naira correctly

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="payroll-${run.period}.csv"`,
    },
  });
}
