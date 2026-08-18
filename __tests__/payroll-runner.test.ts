/**
 * __tests__/payroll-runner.test.ts
 *
 * Integration tests for the payroll runner (migration 023).
 * Requires a local PostgreSQL instance with the dev schema + seed applied.
 *
 * Run:  npm test -- payroll-runner
 */

import { Pool } from 'pg';
import { runMonthlyPayroll, approvePayrollRun, markPayrollPaid } from '../lib/payroll/runner';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/ibuynaija_dev',
});

const SELLER_ID = 'a0000000-0000-0000-0000-000000000001'; // seeded seller
const PERIOD = '2026-05';

async function cleanup() {
  // Remove runs (cascades payslips + remittances), employees, settings, expenses
  await pool.query(`DELETE FROM payroll_runs WHERE seller_id = $1`, [SELLER_ID]);
  await pool.query(`DELETE FROM payroll_employees WHERE seller_id = $1`, [SELLER_ID]);
  await pool.query(`DELETE FROM payroll_settings WHERE seller_id = $1`, [SELLER_ID]);
  await pool.query(`DELETE FROM expenses WHERE seller_id = $1 AND category = 'Payroll'`, [SELLER_ID]);
}

beforeAll(async () => {
  await cleanup();

  await pool.query(
    `INSERT INTO payroll_settings (seller_id, is_registered_employer, pension_enrolled, nhf_enrolled, state_of_operation, pay_day)
     VALUES ($1, TRUE, TRUE, TRUE, 'Lagos', 25)`,
    [SELLER_ID],
  );

  // Monthly employee, gross 200,000 split 50/30/20
  await pool.query(
    `INSERT INTO payroll_employees
       (seller_id, name, salary_type, gross_monthly_salary, salary_structure, pension_applicable, nhf_applicable, start_date)
     VALUES ($1, 'Ada Monthly', 'monthly', 200000,
             '{"basic":100000,"housing":60000,"transport":40000,"otherAllowances":[],"grossTotal":200000}'::jsonb,
             TRUE, TRUE, '2026-01-01')`,
    [SELLER_ID],
  );

  // Low earner below PAYE threshold
  await pool.query(
    `INSERT INTO payroll_employees
       (seller_id, name, salary_type, gross_monthly_salary, salary_structure, pension_applicable, nhf_applicable, start_date)
     VALUES ($1, 'Bola Junior', 'monthly', 50000,
             '{"basic":25000,"housing":15000,"transport":10000,"otherAllowances":[],"grossTotal":50000}'::jsonb,
             TRUE, TRUE, '2026-01-01')`,
    [SELLER_ID],
  );
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe('runMonthlyPayroll (§ migration 023)', () => {
  let runId: string;

  test('creates a run with payslips and remittances', async () => {
    const result = await runMonthlyPayroll(SELLER_ID, PERIOD);
    runId = result.runId;

    expect(result.employeeCount).toBe(2);
    expect(result.totalGrossPay).toBe(250_000); // 200K + 50K

    const { rows: slips } = await pool.query(
      `SELECT employee_name, gross_pay, net_pay FROM payslip_records WHERE payroll_run_id = $1 ORDER BY employee_name`,
      [runId],
    );
    expect(slips).toHaveLength(2);

    // Ada: PAYE ~16,850, pension 16K, NHF 5K → net ~162,150
    const ada = slips.find(s => s.employee_name === 'Ada Monthly')!;
    expect(parseFloat(ada.net_pay)).toBeCloseTo(162_150, 0);

    // Remittances: PAYE, PEN, NHF, PEN-ER, NSITF, ITF should all appear
    const { rows: remits } = await pool.query(
      `SELECT deduction_type, total_amount FROM remittance_obligations WHERE payroll_run_id = $1`,
      [runId],
    );
    const types = remits.map(r => r.deduction_type).sort();
    expect(types).toEqual(['itf', 'nhf', 'nsitf', 'paye', 'pension_employee', 'pension_employer'].sort());

    // Pension employee remittance = 16,000 (Ada) + 4,000 (Bola) = 20,000
    const pen = remits.find(r => r.deduction_type === 'pension_employee')!;
    expect(parseFloat(pen.total_amount)).toBe(20_000);
  });

  test('rejects a duplicate run for the same period', async () => {
    await expect(runMonthlyPayroll(SELLER_ID, PERIOD)).rejects.toThrow(/already exists/i);
  });

  test('approve then mark-paid records a labour expense', async () => {
    await approvePayrollRun(SELLER_ID, runId, 'test-admin');

    const { rows: afterApprove } = await pool.query(
      `SELECT status FROM payroll_runs WHERE id = $1`, [runId],
    );
    expect(afterApprove[0].status).toBe('approved');

    await markPayrollPaid(SELLER_ID, runId);

    const { rows: afterPaid } = await pool.query(
      `SELECT status, total_employer_costs FROM payroll_runs WHERE id = $1`, [runId],
    );
    expect(afterPaid[0].status).toBe('paid');

    const { rows: expenses } = await pool.query(
      `SELECT amount FROM expenses WHERE seller_id = $1 AND category = 'Payroll'`, [SELLER_ID],
    );
    expect(expenses).toHaveLength(1);
    expect(parseFloat(expenses[0].amount)).toBeCloseTo(parseFloat(afterPaid[0].total_employer_costs), 2);
  });

  test('cannot mark paid a run that is not approved', async () => {
    // Fresh run in a different period, still draft
    const { runId: draftId } = await runMonthlyPayroll(SELLER_ID, '2026-06');
    await expect(markPayrollPaid(SELLER_ID, draftId)).rejects.toThrow(/approved/i);
  });
});
