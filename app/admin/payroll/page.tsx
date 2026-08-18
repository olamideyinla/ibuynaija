import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';
import { pool } from '@/lib/db';
import { formatNaira } from '@/lib/format';

export const metadata = { title: 'Payroll Oversight - Admin | iBuyNaija' };

const NAVY = '#1B2A4A';
const MUTED = '#8A7E66';

export default async function AdminPayrollPage({
  searchParams,
}: { searchParams: Promise<{ period?: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { period } = await searchParams;
  const filter = period && /^\d{4}-\d{2}$/.test(period) ? period : null;

  const { rows: runs } = await pool.query(
    `SELECT r.id, r.period, r.status, r.employee_count, r.total_gross_pay, r.total_net_pay,
            r.total_paye, r.total_employer_costs, r.date_created, s.business_name
     FROM payroll_runs r
     JOIN sellers s ON s.id = r.seller_id
     ${filter ? 'WHERE r.period = $1' : ''}
     ORDER BY r.period DESC, s.business_name
     LIMIT 200`,
    filter ? [filter] : [],
  );

  const { rows: periods } = await pool.query(
    `SELECT DISTINCT period FROM payroll_runs ORDER BY period DESC LIMIT 24`,
  );

  const totalNet = runs.reduce((s, r) => s + parseFloat(r.total_net_pay), 0);
  const totalPaye = runs.reduce((s, r) => s + parseFloat(r.total_paye), 0);

  const th: React.CSSProperties = { fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', padding: '10px 14px' };
  const td: React.CSSProperties = { fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: NAVY, padding: '10px 14px', borderTop: '1px solid rgba(27,42,74,0.06)' };
  const statusColor: Record<string, string> = { draft: '#9B6F00', approved: '#1B2A4A', paid: '#2E7D32' };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '36px 24px' }}>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: NAVY, margin: '0 0 8px' }}>
        Payroll Oversight
      </h1>
      <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: MUTED, margin: '0 0 20px' }}>
        Read-only view of payroll runs across all sellers. {filter ? `Showing ${filter}.` : 'Showing all periods.'}
      </p>

      {/* Period filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <a href="/admin/payroll" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: filter ? 400 : 700, color: NAVY, textDecoration: 'none', padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(27,42,74,0.15)', background: filter ? '#fff' : 'rgba(27,42,74,0.06)' }}>
          All
        </a>
        {periods.map(p => (
          <a key={p.period} href={`/admin/payroll?period=${p.period}`} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: filter === p.period ? 700 : 400, color: NAVY, textDecoration: 'none', padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(27,42,74,0.15)', background: filter === p.period ? 'rgba(27,42,74,0.06)' : '#fff' }}>
            {p.period}
          </a>
        ))}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          ['Runs', String(runs.length)],
          ['Total net pay', formatNaira(totalNet) ?? '₦0'],
          ['Total PAYE', formatNaira(totalPaye) ?? '₦0'],
        ].map(([label, val]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: NAVY }}>{val}</div>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: MUTED }}>{label}</div>
          </div>
        ))}
      </div>

      {runs.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: 20, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: MUTED }}>
          No payroll runs {filter ? `for ${filter}` : 'yet'}.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr>
                <th style={th}>Seller</th>
                <th style={th}>Period</th>
                <th style={{ ...th, textAlign: 'right' }}>Staff</th>
                <th style={{ ...th, textAlign: 'right' }}>Net pay</th>
                <th style={{ ...th, textAlign: 'right' }}>PAYE</th>
                <th style={{ ...th, textAlign: 'right' }}>Employer cost</th>
                <th style={{ ...th, textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.business_name}</td>
                  <td style={td}>{r.period}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{r.employee_count}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{formatNaira(r.total_net_pay)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{formatNaira(r.total_paye)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{formatNaira(r.total_employer_costs)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: statusColor[r.status] ?? MUTED }}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
