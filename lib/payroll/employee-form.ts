/**
 * lib/payroll/employee-form.ts
 *
 * Shared parsing/validation for the employee create + edit API routes.
 * Turns a JSON body into the column values persisted in payroll_employees,
 * building the salary_structure jsonb from basic/housing/transport (defaulting
 * to a 50/30/20 split of gross when a breakdown is not provided).
 */

import type { SalaryStructure } from '@/types';
import { buildStructureFromGross } from './salary-template';

export interface EmployeeFields {
  name: string;
  salary_type: 'monthly' | 'daily';
  gross_monthly_salary: number | null;
  daily_rate: number | null;
  salary_structure: SalaryStructure;
  tax_id: string | null;
  annual_rent_paid: number | null;
  pension_applicable: boolean;
  nhf_applicable: boolean;
  nhis_applicable: boolean;
  life_insurance_premium: number | null;
  bank_name: string | null;
  bank_account_number: string | null;
  start_date: string;
}

const posNumOrNull = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const strOrNull = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

export function parseEmployeeBody(
  b: Record<string, unknown>,
): { error: string } | { fields: EmployeeFields } {
  const name = strOrNull(b.name);
  if (!name) return { error: 'Employee name is required' };

  const salaryType = b.salary_type === 'daily' ? 'daily' : 'monthly';

  const gross = posNumOrNull(b.gross_monthly_salary);
  const dailyRate = posNumOrNull(b.daily_rate);

  if (salaryType === 'monthly' && (!gross || gross <= 0)) {
    return { error: 'Monthly employees need a gross monthly salary greater than 0' };
  }
  if (salaryType === 'daily' && (!dailyRate || dailyRate <= 0)) {
    return { error: 'Daily employees need a daily rate greater than 0' };
  }

  // Salary structure: use explicit basic/housing/transport when provided, else
  // apply the default template (Basic 42 / Housing 25 / Transport 15 / Lunch 10 /
  // Leave 8 percent of gross) via buildStructureFromGross.
  const basic = posNumOrNull(b.basic) ?? 0;
  const housing = posNumOrNull(b.housing) ?? 0;
  const transport = posNumOrNull(b.transport) ?? 0;
  const grossTotal = gross ?? (salaryType === 'daily' ? (dailyRate ?? 0) * 26 : 0);

  let salary_structure: SalaryStructure;
  if (basic + housing + transport > 0) {
    salary_structure = {
      basic, housing, transport,
      otherAllowances: [],
      grossTotal: grossTotal || basic + housing + transport,
    };
  } else {
    salary_structure = buildStructureFromGross(grossTotal);
  }

  let startDate = strOrNull(b.start_date);
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    startDate = new Date().toISOString().slice(0, 10);
  }

  return {
    fields: {
      name,
      salary_type: salaryType,
      gross_monthly_salary: salaryType === 'monthly' ? gross : null,
      daily_rate: salaryType === 'daily' ? dailyRate : null,
      salary_structure,
      tax_id: strOrNull(b.tax_id),
      annual_rent_paid: posNumOrNull(b.annual_rent_paid),
      pension_applicable: b.pension_applicable === undefined ? true : Boolean(b.pension_applicable),
      nhf_applicable: Boolean(b.nhf_applicable),
      nhis_applicable: Boolean(b.nhis_applicable),
      life_insurance_premium: posNumOrNull(b.life_insurance_premium),
      bank_name: strOrNull(b.bank_name),
      bank_account_number: strOrNull(b.bank_account_number),
      start_date: startDate,
    },
  };
}
