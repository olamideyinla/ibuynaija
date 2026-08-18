/**
 * lib/payroll/engine.ts
 *
 * THE Nigeria payroll calculation engine (with lib/payroll/nigeria-profile.ts).
 *
 * IMPORTANT: This is the single implementation of the payroll tax logic.
 * Do NOT copy these rules into pages, routes, or SQL. Import and call it.
 *
 * Reads rules from a CountryPayrollProfile and produces a fully-calculated
 * payslip (earnings, deductions, employer contributions, tax, reliefs, totals).
 *
 * Ported from the verified agri-manager implementation, trimmed to Nigeria.
 *
 * This is a management tool, not a licensed payroll processor. Results should be
 * verified with a qualified tax professional.
 */

import type {
  CountryPayrollProfile,
  PayrollSettingsInput,
  EmployeePayrollInput,
  ComputedPayslip,
  PayslipEarning,
  PayslipDeduction,
  PayslipEmployerContribution,
  SalaryStructure,
  PayrollRateOverride,
} from '@/types';

// ── Tax bracket engine ────────────────────────────────────────────────────────

export function applyBrackets(
  income: number,
  brackets: { min: number; max: number | null; rate: number }[],
): number {
  if (income <= 0) return 0;
  let tax = 0;
  let remaining = income;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const bracketWidth = bracket.max !== null ? bracket.max - bracket.min : remaining;
    const taxableInBracket = Math.min(remaining, bracketWidth);
    tax += taxableInBracket * (bracket.rate / 100);
    remaining -= taxableInBracket;
  }

  return Math.max(0, tax);
}

// ── Rate override helper ──────────────────────────────────────────────────────

function getEffectiveRate(
  deductionId: string,
  field: PayrollRateOverride['field'],
  defaultValue: number | null,
  overrides: PayrollRateOverride[],
): number | null {
  const override = overrides.find(o => o.deductionId === deductionId && o.field === field);
  return override ? override.overrideValue : defaultValue;
}

// ── Basis amount resolver ─────────────────────────────────────────────────────

function resolveBasis(
  basis: string,
  structure: SalaryStructure,
  grossPay: number,
): number {
  switch (basis) {
    case 'gross':
      return grossPay;
    case 'basic':
      return structure.basic;
    case 'basic_housing_transport':
    case 'pensionable':
      return structure.basic + structure.housing + structure.transport;
    default:
      return grossPay;
  }
}

// ── Main calculation function ─────────────────────────────────────────────────

export function calculatePayslip(
  employee: EmployeePayrollInput,
  profile: CountryPayrollProfile,
  settings: PayrollSettingsInput,
  period: string,          // YYYY-MM
  attendanceDays?: number, // for daily-rated employees
): ComputedPayslip {
  const assumptions: string[] = [];
  const appliedReliefs: { name: string; amount: number }[] = [];
  const earnings: PayslipEarning[] = [];
  const deductions: PayslipDeduction[] = [];
  const employerContributions: PayslipEmployerContribution[] = [];

  const overrides = settings.payrollRateOverrides ?? [];

  // ── 1. GROSS PAY ────────────────────────────────────────────────────────────

  let grossPay: number;
  const structure = employee.salaryStructure;

  if (employee.salaryType === 'daily') {
    const days = attendanceDays ?? 26;
    if (attendanceDays === undefined) {
      assumptions.push('Daily worker: attendance not provided, using 26 working days');
    } else {
      assumptions.push(`Daily worker: ${days} days at ${profile.currency} ${(employee.dailyRate ?? 0).toLocaleString()} per day`);
    }
    grossPay = (employee.dailyRate ?? 0) * days;
  } else {
    grossPay = employee.grossMonthlySalary ?? structure.grossTotal ?? 0;
  }

  // Build earnings array
  if (structure.basic > 0)        earnings.push({ name: 'Basic Salary',        amount: structure.basic });
  if (structure.housing > 0)      earnings.push({ name: 'Housing Allowance',   amount: structure.housing });
  if (structure.transport > 0)    earnings.push({ name: 'Transport Allowance', amount: structure.transport });
  if ((structure.lunch ?? 0) > 0) earnings.push({ name: 'Lunch Allowance',     amount: structure.lunch! });
  for (const a of structure.otherAllowances) {
    if (a.amount > 0) earnings.push({ name: a.name, amount: a.amount });
  }
  if (earnings.length === 0) {
    earnings.push({ name: 'Gross Pay', amount: grossPay });
    assumptions.push('Using gross pay, no salary structure breakdown provided');
  }

  // ── 2. PENSIONABLE EMOLUMENTS ───────────────────────────────────────────────

  const pensionableEmoluments = structure.basic + structure.housing + structure.transport;

  // ── 3. PRE-TAX STATUTORY DEDUCTIONS ────────────────────────────────────────

  let totalPreTaxDeductions = 0;

  for (const ded of profile.statutoryDeductions) {
    if (!ded.preTax) continue;
    if (ded.paidBy === 'employer') continue;

    // Check employee applicability
    if (ded.id === 'pension_employee' && !employee.pensionApplicable) {
      assumptions.push('Pension not deducted, employee marked as exempt');
      continue;
    }
    if (ded.id === 'nhf' && !employee.nhfApplicable) {
      assumptions.push('NHF not deducted, employee not enrolled');
      continue;
    }
    if (ded.id === 'nhis_employee' && !employee.nhisApplicable) {
      assumptions.push('NHIS not deducted, employee not enrolled');
      continue;
    }

    const basisAmount = ded.basis === 'pensionable' || ded.basis === 'basic_housing_transport'
      ? pensionableEmoluments
      : resolveBasis(ded.basis, structure, grossPay);

    const rate = getEffectiveRate(ded.id, 'employeeRate', ded.employeeRate, overrides);
    const fixedAmt = ded.employeeFixedAmount;
    let amount = 0;

    if (rate !== null) {
      amount = basisAmount * (rate / 100);
    } else if (fixedAmt !== null) {
      amount = fixedAmt;
    }

    const cap = getEffectiveRate(ded.id, 'employeeCap', ded.employeeCap, overrides);
    if (cap !== null && amount > cap) amount = cap;

    amount = Math.round(amount * 100) / 100;
    if (amount > 0) {
      const rateLabel = rate !== null ? ` (${rate}%)` : '';
      deductions.push({
        name: `${ded.name}${rateLabel}`,
        shortCode: ded.shortCode,
        amount,
        isStatutory: true,
      });
      totalPreTaxDeductions += amount;
    }
  }

  // ── 4 & 5. TAX RELIEFS -> TAXABLE INCOME ───────────────────────────────────

  const annualGross = grossPay * 12;
  let annualIncomeReliefs = totalPreTaxDeductions * 12; // pension, NHF, NHIS already monthly

  for (const relief of profile.taxReliefs) {
    if (relief.id === 'rent_relief') {
      if (employee.annualRentPaid && employee.annualRentPaid > 0) {
        const rentRelief = Math.min(
          (relief.value! / 100) * employee.annualRentPaid,
          relief.cap!,
        );
        annualIncomeReliefs += rentRelief;
        appliedReliefs.push({ name: relief.name, amount: rentRelief / 12 });
      } else {
        assumptions.push('No rent relief applied, rent details not provided');
      }
    }
    if (relief.id === 'life_insurance') {
      if (employee.lifeInsurancePremium && employee.lifeInsurancePremium > 0) {
        annualIncomeReliefs += employee.lifeInsurancePremium;
        appliedReliefs.push({ name: relief.name, amount: employee.lifeInsurancePremium / 12 });
      }
    }
  }

  const annualTaxableIncome = Math.max(0, annualGross - annualIncomeReliefs);

  // ── 6 & 7. COMPUTE PAYE ─────────────────────────────────────────────────────
  // Nigeria: brackets apply to annual chargeable income, then divide by 12.

  const annualPAYE = applyBrackets(annualTaxableIncome, profile.taxSystem.brackets);
  let monthlyPAYE = Math.round((annualPAYE / 12) * 100) / 100;
  const taxableIncome = annualTaxableIncome / 12; // monthly equivalent, for display

  if (monthlyPAYE > 0) {
    deductions.push({
      name: 'PAYE Tax',
      shortCode: 'PAYE',
      amount: monthlyPAYE,
      isStatutory: true,
    });
  }

  // ── 8. POST-TAX STATUTORY DEDUCTIONS ───────────────────────────────────────
  // (Nigeria has none on the employee side today, but kept profile-driven.)

  for (const ded of profile.statutoryDeductions) {
    if (ded.preTax) continue;
    if (ded.paidBy === 'employer') continue;

    const basisAmount = resolveBasis(ded.basis, structure, grossPay);
    const rate = getEffectiveRate(ded.id, 'employeeRate', ded.employeeRate, overrides);
    const fixedAmt = ded.employeeFixedAmount;
    let amount = 0;

    if (rate !== null) {
      amount = basisAmount * (rate / 100);
    } else if (fixedAmt !== null) {
      amount = fixedAmt;
    }

    const cap = getEffectiveRate(ded.id, 'employeeCap', ded.employeeCap, overrides);
    if (cap !== null && amount > cap) amount = cap;

    amount = Math.round(amount * 100) / 100;
    if (amount > 0) {
      const rateLabel = rate !== null ? ` (${rate}%)` : '';
      deductions.push({
        name: `${ded.name}${rateLabel}`,
        shortCode: ded.shortCode,
        amount,
        isStatutory: true,
      });
    }
  }

  // ── 9. CUSTOM DEDUCTIONS ────────────────────────────────────────────────────

  for (const custom of employee.otherDeductions) {
    const [year, month] = period.split('-').map(Number);
    const [sy, sm] = custom.startMonth.split('-').map(Number);
    const startedOrBeforeNow = (sy < year) || (sy === year && sm <= month);

    let apply = false;
    if (custom.frequency === 'monthly' && startedOrBeforeNow) apply = true;
    if (custom.frequency === 'once' && custom.startMonth === period) apply = true;
    if (custom.frequency === 'until_cleared' && startedOrBeforeNow && (custom.remainingBalance ?? 0) > 0) {
      apply = true;
    }

    if (!apply) continue;

    const dedAmount = custom.frequency === 'until_cleared'
      ? Math.min(custom.amount, custom.remainingBalance ?? custom.amount)
      : custom.amount;

    deductions.push({
      name: custom.name,
      shortCode: 'DED',
      amount: Math.round(dedAmount * 100) / 100,
      isStatutory: false,
    });
  }

  // ── 10. EMPLOYER CONTRIBUTIONS ──────────────────────────────────────────────

  for (const ded of profile.statutoryDeductions) {
    if (ded.paidBy === 'employee') continue;

    if (ded.id === 'pension_employer' && !employee.pensionApplicable) continue;
    if (ded.id === 'nhis_employer' && !employee.nhisApplicable) continue;

    const basisAmount = ded.basis === 'basic_housing_transport' || ded.basis === 'pensionable'
      ? pensionableEmoluments
      : resolveBasis(ded.basis, structure, grossPay);

    const rate = getEffectiveRate(ded.id, 'employerRate', ded.employerRate, overrides);
    const fixedAmt = ded.employerFixedAmount;
    let amount = 0;

    if (rate !== null) {
      amount = basisAmount * (rate / 100);
    } else if (fixedAmt !== null) {
      amount = fixedAmt;
    }

    const cap = getEffectiveRate(ded.id, 'employerCap', ded.employerCap, overrides);
    if (cap !== null && amount > cap) amount = cap;

    amount = Math.round(amount * 100) / 100;
    if (amount > 0) {
      const rateLabel = rate !== null ? ` (${rate}%)` : '';
      employerContributions.push({
        name: `${ded.name}${rateLabel}`,
        shortCode: ded.shortCode,
        amount,
      });
    }
  }

  // ── 11. TOTALS ──────────────────────────────────────────────────────────────

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const netPay = Math.max(0, Math.round((grossPay - totalDeductions) * 100) / 100);
  const totalEmployerContributions = employerContributions.reduce((s, c) => s + c.amount, 0);
  const totalEmployerCost = Math.round((grossPay + totalEmployerContributions) * 100) / 100;

  return {
    employeeId: employee.employeeId,
    period,
    earnings,
    deductions,
    employerContributions,
    grossPay: Math.round(grossPay * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay,
    totalEmployerCost,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    appliedReliefs,
    assumptions: [...new Set(assumptions)],
  };
}
