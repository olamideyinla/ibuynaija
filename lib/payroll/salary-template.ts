/**
 * lib/payroll/salary-template.ts
 *
 * The default Nigerian salary-structure template used by the gross-up calculator
 * and as the default breakdown for new employees.
 *
 * gross = Basic + Housing + Transport + Lunch + Leave, where Leave is ~19% of
 * Basic. Only Basic + Housing + Transport are pensionable under NTA 2025; Lunch
 * and Leave are taxable but not pensionable, so they are carried as allowances.
 */

import type { SalaryStructure } from '@/types';

/** Default split as a fraction of gross (sums to 1.00). Leave 8% ≈ 19% of Basic 42%. */
export const DEFAULT_STRUCTURE_PCT = {
  basic: 0.42,
  housing: 0.25,
  transport: 0.15,
  lunch: 0.10,
  leave: 0.08,
} as const;

export type StructurePct = {
  basic: number; housing: number; transport: number; lunch: number; leave: number;
};

export type ExtraAllowance = { name: string; amount: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Build a SalaryStructure from a gross figure and a percentage template.
 * Housing/Transport/Lunch/Leave are computed from the percentages; Basic absorbs
 * any rounding remainder so the parts sum exactly to gross. Extra allowances are
 * added on top of the templated gross (taxable, non-pensionable).
 */
export function buildStructureFromGross(
  gross: number,
  pct: StructurePct = DEFAULT_STRUCTURE_PCT,
  extraAllowances: ExtraAllowance[] = [],
): SalaryStructure {
  const templatedGross = Math.max(0, gross);
  const housing = round2(templatedGross * pct.housing);
  const transport = round2(templatedGross * pct.transport);
  const lunch = round2(templatedGross * pct.lunch);
  const leave = round2(templatedGross * pct.leave);
  const basic = round2(templatedGross - housing - transport - lunch - leave);

  const otherAllowances = [
    { name: 'Leave Allowance', amount: leave, taxable: true },
    ...extraAllowances
      .filter(a => a.name.trim() && a.amount > 0)
      .map(a => ({ name: a.name.trim(), amount: round2(a.amount), taxable: true })),
  ];

  const extraTotal = extraAllowances
    .filter(a => a.name.trim() && a.amount > 0)
    .reduce((s, a) => s + a.amount, 0);

  return {
    basic,
    housing,
    transport,
    lunch,
    otherAllowances,
    grossTotal: round2(templatedGross + extraTotal),
  };
}
