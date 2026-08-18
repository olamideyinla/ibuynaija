/**
 * __tests__/payroll-grossup.test.ts
 *
 * Unit tests for the gross-up "quick check" (desired net -> required gross)
 * and the default salary-structure template. Pure logic, no DB.
 */

import { grossUpFromNet } from '../lib/payroll/grossup';
import { buildStructureFromGross, DEFAULT_STRUCTURE_PCT } from '../lib/payroll/salary-template';

describe('buildStructureFromGross', () => {
  it('splits gross so the parts sum back to gross', () => {
    const s = buildStructureFromGross(1_000_000);
    const total = s.basic + s.housing + s.transport + (s.lunch ?? 0)
      + s.otherAllowances.reduce((a, x) => a + x.amount, 0);
    expect(total).toBeCloseTo(1_000_000, 2);
  });

  it('makes Leave about 19% of Basic with the default template', () => {
    const s = buildStructureFromGross(1_000_000);
    const leave = s.otherAllowances.find(a => a.name === 'Leave Allowance')!.amount;
    expect(leave / s.basic).toBeCloseTo(0.19, 1);
  });

  it('keeps only Basic + Housing + Transport pensionable (Lunch/Leave are allowances)', () => {
    const s = buildStructureFromGross(1_000_000);
    // 42/25/15 of gross are pensionable = 82%
    expect((s.basic + s.housing + s.transport) / 1_000_000).toBeCloseTo(0.82, 2);
    expect(DEFAULT_STRUCTURE_PCT.lunch + DEFAULT_STRUCTURE_PCT.leave).toBeCloseTo(0.18, 5);
  });
});

describe('grossUpFromNet', () => {
  it('finds a gross whose net matches the target (pension + NHF)', () => {
    const { requiredGross, payslip } = grossUpFromNet(150_000, {
      pensionApplicable: true, nhfApplicable: true,
    });
    expect(requiredGross).toBeGreaterThan(150_000);
    expect(payslip.netPay).toBeCloseTo(150_000, 0);
  });

  it('returns gross == net when no deductions apply (low earner, no pension/NHF)', () => {
    // 40,000/month = 480,000/year, below the 800k PAYE exemption; no pension/NHF
    const { requiredGross, payslip } = grossUpFromNet(40_000, {
      pensionApplicable: false, nhfApplicable: false, nhisApplicable: false,
    });
    expect(requiredGross).toBeCloseTo(40_000, 0);
    expect(payslip.netPay).toBeCloseTo(40_000, 0);
  });

  it('is monotonic: a higher target net needs a higher gross', () => {
    const a = grossUpFromNet(100_000, { pensionApplicable: true }).requiredGross;
    const b = grossUpFromNet(300_000, { pensionApplicable: true }).requiredGross;
    expect(b).toBeGreaterThan(a);
  });

  it('a higher target nets more take-home after gross-up', () => {
    const lo = grossUpFromNet(100_000, { pensionApplicable: true }).payslip.netPay;
    const hi = grossUpFromNet(300_000, { pensionApplicable: true }).payslip.netPay;
    expect(hi).toBeGreaterThan(lo);
  });

  it('returns zero for a non-positive target', () => {
    expect(grossUpFromNet(0).requiredGross).toBe(0);
    expect(grossUpFromNet(-5000).requiredGross).toBe(0);
  });
});
