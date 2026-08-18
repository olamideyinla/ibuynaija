import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';

export const metadata = { title: 'Payroll | iBuyNaija' };

const NAVY = '#1B2A4A';
const MUTED = '#8A7E66';

export default async function PayrollHomePage() {
  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const [{ rows: settingsRows }, { rows: empRows }, { rows: runRows }, { rows: remitRows }] =
    await Promise.all([
      pool.query(`SELECT 1 FROM payroll_settings WHERE seller_id = $1`, [sellerId]),
      pool.query(`SELECT COUNT(*)::int AS n FROM payroll_employees WHERE seller_id = $1 AND active = TRUE`, [sellerId]),
      pool.query(
        `SELECT id, period, status, total_net_pay, employee_count, run_date
         FROM payroll_runs WHERE seller_id = $1 ORDER BY period DESC LIMIT 6`,
        [sellerId],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS n, COALESCE(SUM(total_amount), 0) AS total
         FROM remittance_obligations WHERE seller_id = $1 AND status = 'pending'`,
        [sellerId],
      ),
    ]);

  const hasSettings = settingsRows.length > 0;
  const activeEmployees = empRows[0].n as number;
  const pendingRemit = remitRows[0];

  const card: React.CSSProperties = {
    background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '18px 22px',
  };
  const label: React.CSSProperties = {
    fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: MUTED,
  };
  const heading: React.CSSProperties = {
    fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: NAVY,
  };

  function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...heading, fontSize: 15, marginBottom: 3 }}>{title}</div>
            <div style={label}>{desc}</div>
          </div>
          <span style={{ color: MUTED, fontSize: 18 }}>›</span>
        </div>
      </Link>
    );
  }

  const statusColor: Record<string, string> = {
    draft: '#9B6F00', approved: '#1B2A4A', paid: '#2E7D32',
  };

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>
        <Link href="/dashboard" style={{ ...label, textDecoration: 'none', color: MUTED }}>‹ Back to dashboard</Link>
        <h1 style={{ ...heading, fontSize: 28, margin: '10px 0 4px' }}>Payroll</h1>
        <p style={{ ...label, margin: '0 0 24px' }}>
          Nigeria payroll under the Nigeria Tax Act 2025: PAYE, pension, NHF, NHIS, and statutory remittances.
        </p>

        {/* Disclaimer */}
        <div style={{ background: 'rgba(217,160,45,0.1)', border: '1px solid rgba(217,160,45,0.4)', borderRadius: 12, padding: '12px 16px', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, color: '#9B6F00', lineHeight: 1.5 }}>
            This is a management tool, not a licensed payroll processor. Confirm figures with a qualified tax
            professional before paying staff or remitting to authorities.
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={card}>
            <div style={{ ...heading, fontSize: 32, marginBottom: 4 }}>{activeEmployees}</div>
            <div style={label}>Active employees</div>
          </div>
          <div style={card}>
            <div style={{ ...heading, fontSize: 32, marginBottom: 4, color: pendingRemit.n > 0 ? '#9B6F00' : NAVY }}>
              {formatNaira(pendingRemit.total) ?? '₦0'}
            </div>
            <div style={label}>{pendingRemit.n} pending remittance{pendingRemit.n === 1 ? '' : 's'}</div>
          </div>
        </div>

        {!hasSettings && (
          <div style={{ ...card, borderColor: 'rgba(193,84,44,0.3)', marginBottom: 24 }}>
            <div style={{ ...heading, fontSize: 15, marginBottom: 4 }}>Set up payroll first</div>
            <p style={{ ...label, margin: '0 0 12px', lineHeight: 1.5 }}>
              Configure your employer details (PFA, state of operation, enrolments) before running payroll.
            </p>
            <Link href="/dashboard/payroll/settings" style={{ display: 'inline-block', background: NAVY, color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, padding: '9px 18px', borderRadius: 8, textDecoration: 'none' }}>
              Payroll settings
            </Link>
          </div>
        )}

        {/* Nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          <NavCard href="/dashboard/payroll/employees" title="Employees" desc="Add staff and their salary structure" />
          <NavCard href="/dashboard/payroll/settings" title="Payroll settings" desc="Employer details, PFA, state of operation, enrolments" />
          <NavCard href="/dashboard/payroll/run" title="Run payroll" desc="Calculate a month's payslips and remittances" />
        </div>

        {/* Recent runs */}
        <div style={{ ...heading, fontSize: 16, marginBottom: 12 }}>Recent runs</div>
        {runRows.length === 0 ? (
          <div style={{ ...card, ...label }}>No payroll runs yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {runRows.map(r => (
              <Link key={r.id} href={`/dashboard/payroll/runs/${r.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ ...heading, fontSize: 15 }}>{r.period}</div>
                    <div style={label}>{r.employee_count} staff · net {formatNaira(r.total_net_pay)}</div>
                  </div>
                  <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: statusColor[r.status] ?? MUTED }}>
                    {r.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
