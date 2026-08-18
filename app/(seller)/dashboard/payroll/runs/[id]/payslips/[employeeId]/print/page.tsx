import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';
import type { PayslipRow } from '@/types';
import PrintTrigger from './PrintTrigger';

export const metadata = { title: 'Payslip | iBuyNaija' };

const NAVY = '#1B2A4A';
const MUTED = '#6b6252';

export default async function PayslipPrintPage({
  params,
}: { params: Promise<{ id: string; employeeId: string }> }) {
  const { id, employeeId } = await params;
  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  // Join through the run so we can verify seller ownership in one query.
  const { rows } = await pool.query<PayslipRow & { business_name: string; state: string; city_area: string; period: string }>(
    `SELECT ps.*, s.business_name, s.state, s.city_area
     FROM payslip_records ps
     JOIN payroll_runs r ON r.id = ps.payroll_run_id
     JOIN sellers s ON s.id = r.seller_id
     WHERE ps.payroll_run_id = $1 AND ps.employee_id = $2 AND r.seller_id = $3`,
    [id, employeeId, sellerId],
  );
  if (rows.length === 0) notFound();
  const p = rows[0];

  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, fontFamily: 'Arial, sans-serif' };
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: MUTED, margin: '18px 0 6px', borderBottom: '1px solid #ddd', paddingBottom: 4 };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 32, color: NAVY, fontFamily: 'Arial, sans-serif' }}>
      <PrintTrigger />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${NAVY}`, paddingBottom: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{p.business_name}</div>
          <div style={{ fontSize: 12, color: MUTED }}>{p.city_area}, {p.state}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Payslip</div>
          <div style={{ fontSize: 12, color: MUTED }}>{p.period}</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{p.employee_name}</div>
        <div style={{ fontSize: 12, color: MUTED }}>Pay period: {p.period}</div>
      </div>

      <div style={sectionTitle}>Earnings</div>
      {p.earnings.map((e, i) => (
        <div key={i} style={row}><span>{e.name}</span><span>{formatNaira(e.amount)}</span></div>
      ))}
      <div style={{ ...row, fontWeight: 700, borderTop: '1px solid #ddd', marginTop: 4 }}>
        <span>Gross pay</span><span>{formatNaira(p.gross_pay)}</span>
      </div>

      <div style={sectionTitle}>Deductions</div>
      {p.deductions.length === 0
        ? <div style={{ ...row, color: MUTED }}><span>No deductions</span><span>{formatNaira(0)}</span></div>
        : p.deductions.map((d, i) => (
            <div key={i} style={row}><span>{d.name}</span><span>{formatNaira(d.amount)}</span></div>
          ))}
      <div style={{ ...row, fontWeight: 700, borderTop: '1px solid #ddd', marginTop: 4 }}>
        <span>Total deductions</span><span>{formatNaira(p.total_deductions)}</span>
      </div>

      <div style={{ ...row, fontSize: 16, fontWeight: 700, background: '#f2ede1', padding: '10px 12px', borderRadius: 6, marginTop: 14 }}>
        <span>Net pay</span><span>{formatNaira(p.net_pay)}</span>
      </div>

      {p.employer_contributions.length > 0 && (
        <>
          <div style={sectionTitle}>Employer contributions (not deducted from pay)</div>
          {p.employer_contributions.map((c, i) => (
            <div key={i} style={{ ...row, color: MUTED }}><span>{c.name}</span><span>{formatNaira(c.amount)}</span></div>
          ))}
        </>
      )}

      {p.applied_reliefs.length > 0 && (
        <>
          <div style={sectionTitle}>Tax reliefs applied (monthly)</div>
          {p.applied_reliefs.map((r, i) => (
            <div key={i} style={{ ...row, color: MUTED }}><span>{r.name}</span><span>{formatNaira(r.amount)}</span></div>
          ))}
        </>
      )}

      {p.assumptions.length > 0 && (
        <div style={{ marginTop: 18, fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
          <strong>Notes:</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {p.assumptions.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 20, fontSize: 10.5, color: MUTED, lineHeight: 1.5, borderTop: '1px solid #ddd', paddingTop: 10 }}>
        Calculated under the Nigeria Tax Act 2025. This is a management tool, not a licensed payroll processor.
        Confirm figures with a qualified tax professional.
      </div>
    </div>
  );
}
