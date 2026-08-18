/**
 * __tests__/payroll-engine.test.ts
 *
 * Pure unit tests for the Nigeria payroll engine (NTA 2025). No DB required.
 * Ported/adapted from the verified agri-manager engine tests, Nigeria only.
 */

import { applyBrackets, calculatePayslip } from '../lib/payroll/engine';
import { NIGERIA_PROFILE } from '../lib/payroll/nigeria-profile';
import type { EmployeePayrollInput, PayrollSettingsInput } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSettings(overrides: Partial<PayrollSettingsInput> = {}): PayrollSettingsInput {
  return { payrollRateOverrides: [], ...overrides };
}

function makeEmployee(
  grossMonthly: number,
  overrides: Partial<EmployeePayrollInput> = {},
): EmployeePayrollInput {
  const basic     = grossMonthly * 0.5;
  const housing   = grossMonthly * 0.3;
  const transport = grossMonthly * 0.2;
  return {
    employeeId: 'emp-1',
    salaryType: 'monthly',
    grossMonthlySalary: grossMonthly,
    dailyRate: null,
    salaryStructure: { basic, housing, transport, otherAllowances: [], grossTotal: grossMonthly },
    annualRentPaid: null,
    pensionApplicable: true,
    nhfApplicable: true,
    nhisApplicable: false,
    lifeInsurancePremium: null,
    otherDeductions: [],
    ...overrides,
  };
}

// ── applyBrackets ─────────────────────────────────────────────────────────────

describe('applyBrackets (NTA 2025)', () => {
  it('returns 0 for zero or negative income', () => {
    expect(applyBrackets(0, NIGERIA_PROFILE.taxSystem.brackets)).toBe(0);
    expect(applyBrackets(-500, NIGERIA_PROFILE.taxSystem.brackets)).toBe(0);
  });

  it('is 0 at the 800,000 exemption ceiling', () => {
    expect(applyBrackets(800_000, NIGERIA_PROFILE.taxSystem.brackets)).toBe(0);
  });

  it('taxes only the amount above 800,000 at 15% (1,000,000 annual)', () => {
    // (1,000,000 - 800,000) x 15% = 30,000
    expect(applyBrackets(1_000_000, NIGERIA_PROFILE.taxSystem.brackets)).toBeCloseTo(30_000, 0);
  });

  it('fills the 15% band at 3,000,000 annual', () => {
    // 800K-3M @ 15% = 2,200,000 x 0.15 = 330,000
    expect(applyBrackets(3_000_000, NIGERIA_PROFILE.taxSystem.brackets)).toBeCloseTo(330_000, 0);
  });
});

// ── calculatePayslip ────────────────────────────────────────────────────────

describe('calculatePayslip (Nigeria)', () => {
  it('returns a valid payslip structure', () => {
    const payslip = calculatePayslip(makeEmployee(100_000), NIGERIA_PROFILE, makeSettings(), '2026-01');
    expect(payslip.grossPay).toBe(100_000);
    expect(payslip.netPay).toBeGreaterThan(0);
    expect(payslip.netPay).toBeLessThan(payslip.grossPay);
    expect(payslip.totalDeductions).toBeCloseTo(payslip.grossPay - payslip.netPay, 1);
    expect(payslip.earnings.length).toBeGreaterThan(0);
    expect(payslip.deductions.length).toBeGreaterThan(0);
  });

  it('deducts pension at 8% of basic+housing+transport', () => {
    const payslip = calculatePayslip(makeEmployee(200_000), NIGERIA_PROFILE, makeSettings(), '2026-01');
    const pension = payslip.deductions.find(d => d.shortCode === 'PEN');
    expect(pension).toBeDefined();
    expect(pension!.amount).toBe(16_000); // 200K x 8%
  });

  it('deducts NHF at 2.5% of gross when applicable', () => {
    const payslip = calculatePayslip(makeEmployee(200_000), NIGERIA_PROFILE, makeSettings(), '2026-01');
    const nhf = payslip.deductions.find(d => d.shortCode === 'NHF');
    expect(nhf).toBeDefined();
    expect(nhf!.amount).toBe(5_000); // 200K x 2.5%
  });

  it('has no PAYE when annual chargeable income is at or below 800,000', () => {
    // 50K/month = 600K/year gross, further reduced by pension + NHF
    const payslip = calculatePayslip(makeEmployee(50_000), NIGERIA_PROFILE, makeSettings(), '2026-01');
    expect(payslip.deductions.find(d => d.shortCode === 'PAYE')).toBeUndefined();
    // Net = 50K - pension(4K) - NHF(1.25K) = 44,750
    expect(payslip.netPay).toBeCloseTo(44_750, 1);
  });

  it('computes PAYE for a 200,000/month employee', () => {
    // Annual taxable = 2,400,000 - (16K + 5K) x 12 = 2,148,000
    // (2,148,000 - 800,000) x 15% = 202,200; /12 = 16,850
    const payslip = calculatePayslip(makeEmployee(200_000), NIGERIA_PROFILE, makeSettings(), '2026-01');
    const paye = payslip.deductions.find(d => d.shortCode === 'PAYE');
    expect(paye).toBeDefined();
    expect(paye!.amount).toBeCloseTo(16_850, 0);
    expect(payslip.netPay).toBeCloseTo(162_150, 0);
  });

  it('applies rent relief to reduce PAYE', () => {
    const withRent = calculatePayslip(
      makeEmployee(200_000, { annualRentPaid: 720_000 }),
      NIGERIA_PROFILE, makeSettings(), '2026-01',
    );
    const noRent = calculatePayslip(makeEmployee(200_000), NIGERIA_PROFILE, makeSettings(), '2026-01');
    const payeWith = withRent.deductions.find(d => d.shortCode === 'PAYE')?.amount ?? 0;
    const payeNo   = noRent.deductions.find(d => d.shortCode === 'PAYE')!.amount;
    expect(payeWith).toBeLessThan(payeNo);
    expect(withRent.appliedReliefs.some(r => r.name.toLowerCase().includes('rent'))).toBe(true);
  });

  it('caps rent relief at 500,000 annual', () => {
    // 20% of 3,000,000 = 600,000, capped to 500,000 → monthly relief 41,666.67
    const payslip = calculatePayslip(
      makeEmployee(200_000, { annualRentPaid: 3_000_000 }),
      NIGERIA_PROFILE, makeSettings(), '2026-01',
    );
    const rentRelief = payslip.appliedReliefs.find(r => r.name.toLowerCase().includes('rent'));
    expect(rentRelief).toBeDefined();
    expect(rentRelief!.amount).toBeCloseTo(500_000 / 12, 1);
  });

  it('skips pension when pensionApplicable is false', () => {
    const payslip = calculatePayslip(
      makeEmployee(200_000, { pensionApplicable: false }),
      NIGERIA_PROFILE, makeSettings(), '2026-01',
    );
    expect(payslip.deductions.find(d => d.shortCode === 'PEN')).toBeUndefined();
  });

  it('includes employer pension contribution at 10%', () => {
    const payslip = calculatePayslip(makeEmployee(200_000), NIGERIA_PROFILE, makeSettings(), '2026-01');
    const penEr = payslip.employerContributions.find(c => c.shortCode === 'PEN-ER');
    expect(penEr).toBeDefined();
    expect(penEr!.amount).toBe(20_000); // 200K x 10%
    expect(payslip.totalEmployerCost).toBeGreaterThan(payslip.grossPay);
  });

  it('includes employer NSITF (1%) and ITF (1%) contributions', () => {
    const payslip = calculatePayslip(makeEmployee(200_000), NIGERIA_PROFILE, makeSettings(), '2026-01');
    expect(payslip.employerContributions.find(c => c.shortCode === 'NSITF')!.amount).toBe(2_000);
    expect(payslip.employerContributions.find(c => c.shortCode === 'ITF')!.amount).toBe(2_000);
  });

  it('keeps net = gross - totalDeductions (invariant)', () => {
    const payslip = calculatePayslip(makeEmployee(350_000), NIGERIA_PROFILE, makeSettings(), '2026-04');
    expect(payslip.netPay).toBeCloseTo(payslip.grossPay - payslip.totalDeductions, 1);
  });

  it('grosses up a daily worker by days worked', () => {
    const employee = makeEmployee(0, {
      salaryType: 'daily',
      grossMonthlySalary: null,
      dailyRate: 5_000,
      salaryStructure: { basic: 0, housing: 0, transport: 0, otherAllowances: [], grossTotal: 0 },
    });
    const payslip = calculatePayslip(employee, NIGERIA_PROFILE, makeSettings(), '2026-01', 20);
    expect(payslip.grossPay).toBe(100_000); // 5,000 x 20
  });

  it('applies a custom monthly deduction', () => {
    const payslip = calculatePayslip(
      makeEmployee(100_000, {
        otherDeductions: [{
          id: 'c1', name: 'Loan Repayment', amount: 5_000,
          frequency: 'monthly', remainingBalance: null, startMonth: '2026-01', endMonth: null,
        }],
      }),
      NIGERIA_PROFILE, makeSettings(), '2026-01',
    );
    const loan = payslip.deductions.find(d => d.name === 'Loan Repayment');
    expect(loan).toBeDefined();
    expect(loan!.amount).toBe(5_000);
  });

  it('does not apply a once-off deduction in a later period', () => {
    const payslip = calculatePayslip(
      makeEmployee(100_000, {
        otherDeductions: [{
          id: 'c2', name: 'One-Off', amount: 10_000,
          frequency: 'once', remainingBalance: null, startMonth: '2026-01', endMonth: null,
        }],
      }),
      NIGERIA_PROFILE, makeSettings(), '2026-02',
    );
    expect(payslip.deductions.find(d => d.name === 'One-Off')).toBeUndefined();
  });
});
