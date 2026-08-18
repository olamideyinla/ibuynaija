/**
 * lib/payroll/runner.ts
 *
 * Orchestrates a monthly payroll run for a seller:
 *   load settings + employees -> compute payslips (engine) -> aggregate ->
 *   persist run + payslips + remittance obligations, all in one transaction.
 *
 * Also handles the run lifecycle: approve and mark-paid (which records a labour
 * expense against the seller).
 *
 * The tax math lives in lib/payroll/engine.ts + nigeria-profile.ts. This file
 * only maps rows, aggregates, and persists.
 */

import type { PoolClient } from 'pg';
import { pool } from '@/lib/db';
import { calculatePayslip } from './engine';
import { NIGERIA_PROFILE } from './nigeria-profile';
import type {
  ComputedPayslip,
  EmployeePayrollInput,
  PayrollEmployeeRow,
  PayrollSettingsRow,
  PayrollRunRow,
} from '@/types';

// ── Row -> engine input mappers ────────────────────────────────────────────────

const num = (v: string | null): number | null => (v == null ? null : parseFloat(v));

function toEmployeeInput(row: PayrollEmployeeRow): EmployeePayrollInput {
  const structure = row.salary_structure ?? { basic: 0, housing: 0, transport: 0, otherAllowances: [], grossTotal: 0 };
  return {
    employeeId: row.id,
    salaryType: row.salary_type,
    grossMonthlySalary: num(row.gross_monthly_salary),
    dailyRate: num(row.daily_rate),
    salaryStructure: {
      basic: structure.basic ?? 0,
      housing: structure.housing ?? 0,
      transport: structure.transport ?? 0,
      lunch: structure.lunch,
      otherAllowances: structure.otherAllowances ?? [],
      grossTotal: structure.grossTotal ?? 0,
    },
    annualRentPaid: num(row.annual_rent_paid),
    pensionApplicable: row.pension_applicable,
    nhfApplicable: row.nhf_applicable,
    nhisApplicable: row.nhis_applicable,
    lifeInsurancePremium: num(row.life_insurance_premium),
    otherDeductions: row.other_deductions ?? [],
  };
}

// ── Nigeria remittance metadata ────────────────────────────────────────────────

/** Map a payslip shortCode to the profile deduction id (for due date / authority). */
const SHORTCODE_TO_ID: Record<string, string> = {
  PAYE: 'paye',
  PEN: 'pension_employee',
  'PEN-ER': 'pension_employer',
  NHF: 'nhf',
  NHIS: 'nhis_employee',
  'NHIS-ER': 'nhis_employer',
  NSITF: 'nsitf',
  ITF: 'itf',
};

/** Clean remittance line name per shortCode (no per-employee rate label). */
const SHORTCODE_TO_NAME: Record<string, string> = {
  PAYE: 'PAYE Tax',
  PEN: 'Pension (Employee)',
  'PEN-ER': 'Pension (Employer)',
  NHF: 'National Housing Fund',
  NHIS: 'Health Insurance (Employee)',
  'NHIS-ER': 'Health Insurance (Employer)',
  NSITF: 'Employee Compensation (NSITF)',
  ITF: 'Industrial Training Fund',
};

function remittanceDueDate(period: string, deductionId: string): string {
  const [year, month] = period.split('-').map(Number);
  let dueMonth = month + 1;
  let dueYear = year;
  if (dueMonth > 12) { dueMonth = 1; dueYear++; }
  const mm = String(dueMonth).padStart(2, '0');

  if (deductionId === 'paye') return `${dueYear}-${mm}-10`;            // PAYE: 10th of following month
  if (deductionId.startsWith('pension')) return `${dueYear}-${mm}-28`; // Pension: end of following month
  return `${dueYear}-${mm}-20`;
}

function remittanceTo(deductionId: string, settings: PayrollSettingsRow): string {
  switch (deductionId) {
    case 'paye':
      return settings.state_of_operation
        ? `${settings.state_of_operation} State Internal Revenue Service`
        : 'State Internal Revenue Service (SIRS)';
    case 'pension_employee':
    case 'pension_employer':
      return settings.pfa_name || 'Pension Fund Administrator (PFA)';
    case 'nhf':
      return 'Federal Mortgage Bank of Nigeria (FMBN)';
    case 'nhis_employee':
    case 'nhis_employer':
      return 'National Health Insurance Authority (NHIA)';
    case 'nsitf':
      return 'Nigeria Social Insurance Trust Fund (NSITF)';
    case 'itf':
      return 'Industrial Training Fund (ITF)';
    default:
      return 'Relevant Authority';
  }
}

// ── Run a monthly payroll ──────────────────────────────────────────────────────

export interface PayrollRunResult {
  runId: string;
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
}

export async function runMonthlyPayroll(
  sellerId: string,
  period: string,                                   // YYYY-MM
  daysWorkedByEmployee: Record<string, number> = {}, // for daily employees
): Promise<PayrollRunResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Settings (must exist)
    const { rows: settingsRows } = await client.query<PayrollSettingsRow>(
      `SELECT * FROM payroll_settings WHERE seller_id = $1`,
      [sellerId],
    );
    const settings = settingsRows[0];
    if (!settings) {
      throw new Error('Payroll settings not configured. Set them up before running payroll.');
    }

    // Guard against a duplicate run for the period
    const { rows: existing } = await client.query(
      `SELECT id FROM payroll_runs WHERE seller_id = $1 AND period = $2`,
      [sellerId, period],
    );
    if (existing.length > 0) {
      throw new Error(`A payroll run already exists for ${period}. Delete it first to re-run.`);
    }

    // Active employees
    const { rows: employees } = await client.query<PayrollEmployeeRow>(
      `SELECT * FROM payroll_employees WHERE seller_id = $1 AND active = TRUE ORDER BY name`,
      [sellerId],
    );
    if (employees.length === 0) {
      throw new Error('No active employees to run payroll for. Add at least one employee first.');
    }

    // Compute payslips
    const settingsInput = { payrollRateOverrides: settings.rate_overrides ?? [] };
    const computed: { row: PayrollEmployeeRow; slip: ComputedPayslip }[] = employees.map(row => {
      const input = toEmployeeInput(row);
      const days = row.salary_type === 'daily' ? daysWorkedByEmployee[row.id] : undefined;
      return { row, slip: calculatePayslip(input, NIGERIA_PROFILE, settingsInput, period, days) };
    });

    // Aggregate totals
    const round = (n: number) => Math.round(n * 100) / 100;
    const sumBy = (fn: (s: ComputedPayslip) => number) => round(computed.reduce((acc, c) => acc + fn(c.slip), 0));
    const payeOf = (s: ComputedPayslip) => s.deductions.find(d => d.shortCode === 'PAYE')?.amount ?? 0;
    const penOf  = (s: ComputedPayslip) => s.deductions.find(d => d.shortCode === 'PEN')?.amount ?? 0;

    const totalGrossPay           = sumBy(s => s.grossPay);
    const totalNetPay             = sumBy(s => s.netPay);
    const totalEmployeeDeductions = sumBy(s => s.totalDeductions);
    const totalEmployerCosts      = sumBy(s => s.totalEmployerCost);
    const totalPAYE               = sumBy(payeOf);
    const totalPension            = sumBy(penOf);

    // Insert run
    const { rows: runRows } = await client.query<{ id: string }>(
      `INSERT INTO payroll_runs
         (seller_id, period, status, total_gross_pay, total_net_pay,
          total_employee_deductions, total_employer_costs, total_paye, total_pension,
          employee_count, profile_version_date)
       VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        sellerId, period, totalGrossPay, totalNetPay, totalEmployeeDeductions,
        totalEmployerCosts, totalPAYE, totalPension, computed.length,
        NIGERIA_PROFILE.effectiveDate,
      ],
    );
    const runId = runRows[0].id;

    // Insert payslips
    for (const { row, slip } of computed) {
      await client.query(
        `INSERT INTO payslip_records
           (payroll_run_id, employee_id, employee_name, period, earnings, deductions,
            employer_contributions, gross_pay, total_deductions, net_pay,
            total_employer_cost, taxable_income, applied_reliefs, assumptions)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)`,
        [
          runId, row.id, row.name, period,
          JSON.stringify(slip.earnings), JSON.stringify(slip.deductions),
          JSON.stringify(slip.employerContributions), slip.grossPay, slip.totalDeductions,
          slip.netPay, slip.totalEmployerCost, slip.taxableIncome,
          JSON.stringify(slip.appliedReliefs), JSON.stringify(slip.assumptions),
        ],
      );
    }

    // Aggregate statutory amounts per shortCode across all payslips
    const remitMap = new Map<string, number>();
    for (const { slip } of computed) {
      for (const d of slip.deductions) {
        if (!d.isStatutory) continue;
        remitMap.set(d.shortCode, (remitMap.get(d.shortCode) ?? 0) + d.amount);
      }
      for (const c of slip.employerContributions) {
        remitMap.set(c.shortCode, (remitMap.get(c.shortCode) ?? 0) + c.amount);
      }
    }

    // Insert remittance obligations
    for (const [shortCode, total] of remitMap) {
      if (total <= 0) continue;
      const deductionId = SHORTCODE_TO_ID[shortCode] ?? shortCode.toLowerCase();
      const name = SHORTCODE_TO_NAME[shortCode] ?? shortCode;
      await client.query(
        `INSERT INTO remittance_obligations
           (seller_id, payroll_run_id, period, deduction_type, deduction_name,
            total_amount, due_date, remittance_to, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
        [
          sellerId, runId, period, deductionId, name, round(total),
          remittanceDueDate(period, deductionId), remittanceTo(deductionId, settings),
        ],
      );
    }

    await client.query('COMMIT');
    return { runId, employeeCount: computed.length, totalGrossPay, totalNetPay };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Lifecycle: approve ─────────────────────────────────────────────────────────

export async function approvePayrollRun(
  sellerId: string,
  runId: string,
  approvedBy: string,
): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE payroll_runs
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND seller_id = $3 AND status = 'draft'`,
    [approvedBy, runId, sellerId],
  );
  if (rowCount === 0) {
    throw new Error('Run not found, not owned by you, or not in draft status.');
  }
}

// ── Lifecycle: mark paid (records a labour expense) ─────────────────────────────

export async function markPayrollPaid(sellerId: string, runId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<PayrollRunRow>(
      `SELECT * FROM payroll_runs WHERE id = $1 AND seller_id = $2 FOR UPDATE`,
      [runId, sellerId],
    );
    const run = rows[0];
    if (!run) throw new Error('Payroll run not found.');
    if (run.status !== 'approved') throw new Error('Payroll must be approved before it can be marked paid.');

    await client.query(
      `UPDATE payroll_runs SET status = 'paid', updated_at = NOW() WHERE id = $1`,
      [runId],
    );

    // Record the total employer cost as a labour expense for the seller.
    const employerCost = parseFloat(run.total_employer_costs);
    if (employerCost > 0) {
      await client.query(
        `INSERT INTO expenses (seller_id, amount, date, category, note)
         VALUES ($1, $2, CURRENT_DATE, 'Payroll', $3)`,
        [sellerId, employerCost, `Payroll for ${run.period} (${run.employee_count} staff)`],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Lifecycle: delete a draft run ──────────────────────────────────────────────

export async function deleteDraftRun(
  sellerId: string,
  runId: string,
  client?: PoolClient,
): Promise<void> {
  const q = client ?? pool;
  const { rowCount } = await q.query(
    `DELETE FROM payroll_runs WHERE id = $1 AND seller_id = $2 AND status = 'draft'`,
    [runId, sellerId],
  );
  if (rowCount === 0) {
    throw new Error('Only draft runs can be deleted.');
  }
}
