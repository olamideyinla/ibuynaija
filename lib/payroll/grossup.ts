/**
 * lib/payroll/grossup.ts
 *
 * "Quick check" gross-up: given a desired monthly NET take-home, find the GROSS
 * an employer must set so the employee nets that amount after PAYE, pension, NHF
 * and NHIS. Net is a monotonic increasing function of gross, so we invert the
 * existing forward engine (calculatePayslip) by bisection.
 */

import { calculatePayslip } from './engine';
import { NIGERIA_PROFILE } from './nigeria-profile';
import { buildStructureFromGross, DEFAULT_STRUCTURE_PCT } from './salary-template';
import type { StructurePct, ExtraAllowance } from './salary-template';
import type { ComputedPayslip, EmployeePayrollInput } from '@/types';

export interface GrossUpOptions {
  pct?: StructurePct;
  extraAllowances?: ExtraAllowance[];
  pensionApplicable?: boolean;
  nhfApplicable?: boolean;
  nhisApplicable?: boolean;
  annualRentPaid?: number | null;
}

const PERIOD = new Date().toISOString().slice(0, 7);

function payslipForGross(gross: number, opts: GrossUpOptions): ComputedPayslip {
  const structure = buildStructureFromGross(
    gross,
    opts.pct ?? DEFAULT_STRUCTURE_PCT,
    opts.extraAllowances ?? [],
  );
  const employee: EmployeePayrollInput = {
    employeeId: 'calc',
    salaryType: 'monthly',
    grossMonthlySalary: structure.grossTotal,
    dailyRate: null,
    salaryStructure: structure,
    annualRentPaid: opts.annualRentPaid ?? null,
    pensionApplicable: opts.pensionApplicable ?? true,
    nhfApplicable: opts.nhfApplicable ?? false,
    nhisApplicable: opts.nhisApplicable ?? false,
    lifeInsurancePremium: null,
    otherDeductions: [],
  };
  return calculatePayslip(employee, NIGERIA_PROFILE, { payrollRateOverrides: [] }, PERIOD);
}

export interface GrossUpResult {
  requiredGross: number;
  payslip: ComputedPayslip;
}

/**
 * Find the gross that yields `desiredNet`. Returns the required gross (rounded to
 * the nearest naira) and the full payslip computed at that gross.
 */
export function grossUpFromNet(desiredNet: number, opts: GrossUpOptions = {}): GrossUpResult {
  if (!Number.isFinite(desiredNet) || desiredNet <= 0) {
    return { requiredGross: 0, payslip: payslipForGross(0, opts) };
  }

  // Net is always below gross; even at the top band gross stays under ~1.8x net.
  let lo = desiredNet;
  let hi = desiredNet * 2;
  // Expand hi until it over-shoots (guards against extreme allowance/relief cases).
  for (let i = 0; i < 12 && payslipForGross(hi, opts).netPay < desiredNet; i++) {
    hi *= 1.5;
  }

  // Bisection: 60 iterations converges to sub-kobo precision.
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const net = payslipForGross(mid, opts).netPay;
    if (net < desiredNet) lo = mid;
    else hi = mid;
  }

  const payslip = payslipForGross(Math.round(hi), opts);
  // Report the true total gross (templated base + any extra allowances).
  return { requiredGross: payslip.grossPay, payslip };
}
