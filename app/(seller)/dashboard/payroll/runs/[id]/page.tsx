import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';
import type { PayrollRunRow, PayslipRow, RemittanceRow } from '@/types';
import RunActions from './RunActions';
import RemitButton from './RemitButton';

export const metadata = { title: 'Payroll Run | iBuyNaija' };

const NAVY = '#1B2A4A';
const MUTED = '#8A7E66';

export default async function PayrollRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { rows: runRows } = await pool.query<PayrollRunRow>(
    `SELECT * FROM payroll_runs WHERE id = $1 AND seller_id = $2`,
    [id, sellerId],
  );
  if (runRows.length === 0) notFound();
  const run = runRows[0];

  const [{ rows: slips }, { rows: remits }] = await Promise.all([
    pool.query<PayslipRow>(
      `SELECT * FROM payslip_records WHERE payroll_run_id = $1 ORDER BY employee_name`,
      [id],
    ),
    pool.query<RemittanceRow>(
      `SELECT * FROM remittance_obligations WHERE payroll_run_id = $1 ORDER BY due_date`,
      [id],
    ),
  ]);

  const statusColor: Record<string, string> = { draft: '#9B6F00', approved: '#1B2A4A', paid: '#2E7D32' };
  const card: React.CSSProperties = { background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12 };
  const th: React.CSSProperties = { fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', padding: '10px 14px' };
  const td: React.CSSProperties = { fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: NAVY, padding: '10px 14px', borderTop: '1px solid rgba(27,42,74,0.06)' };

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px' }}>
        <Link href="/dashboard/payroll" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: MUTED, textDecoration: 'none' }}>
          ‹ Back to payroll
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0 4px' }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: NAVY, margin: 0 }}>
            Payroll {run.period}
          </h1>
          <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: statusColor[run.status], background: 'rgba(27,42,74,0.05)', padding: '3px 10px', borderRadius: 20 }}>
            {run.status}
          </span>
        </div>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: MUTED, margin: '0 0 20px' }}>
          {run.employee_count} employees · run on {new Date(run.date_created).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
          {[
            ['Gross pay', run.total_gross_pay],
            ['Net pay', run.total_net_pay],
            ['PAYE', run.total_paye],
            ['Employer cost', run.total_employer_costs],
          ].map(([label, val]) => (
            <div key={label as string} style={{ ...card, padding: '14px 16px' }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: NAVY }}>{formatNaira(val as string)}</div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: MUTED }}>{label}</div>
            </div>
          ))}
        </div>

        <RunActions runId={run.id} status={run.status} />

        {/* Payslips */}
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, margin: '26px 0 12px' }}>Payslips</div>
        <div style={{ ...card, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                <th style={th}>Employee</th>
                <th style={{ ...th, textAlign: 'right' }}>Gross</th>
                <th style={{ ...th, textAlign: 'right' }}>Deductions</th>
                <th style={{ ...th, textAlign: 'right' }}>Net pay</th>
                <th style={{ ...th, textAlign: 'right' }}>Payslip</th>
              </tr>
            </thead>
            <tbody>
              {slips.map(s => (
                <tr key={s.id}>
                  <td style={td}>{s.employee_name}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{formatNaira(s.gross_pay)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{formatNaira(s.total_deductions)}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatNaira(s.net_pay)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <Link href={`/dashboard/payroll/runs/${run.id}/payslips/${s.employee_id}/print`} target="_blank" style={{ color: NAVY, fontWeight: 600, textDecoration: 'none' }}>
                      Print ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Remittances */}
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, margin: '26px 0 12px' }}>Statutory remittances</div>
        <div style={{ ...card, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
            <thead>
              <tr>
                <th style={th}>Deduction</th>
                <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                <th style={th}>Due</th>
                <th style={th}>Remit to</th>
                <th style={{ ...th, textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {remits.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.deduction_name}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatNaira(r.total_amount)}</td>
                  <td style={td}>{new Date(r.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</td>
                  <td style={{ ...td, fontSize: 12.5, color: MUTED }}>{r.remittance_to}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {r.status === 'remitted'
                      ? <span style={{ color: '#2E7D32', fontWeight: 600 }}>Remitted</span>
                      : <RemitButton remittanceId={r.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: MUTED, marginTop: 20, lineHeight: 1.5 }}>
          Calculated under the Nigeria Tax Act 2025. This is a management tool, not a licensed payroll processor.
          Confirm figures with a qualified tax professional.
        </p>
      </main>
    </>
  );
}
