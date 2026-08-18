import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import RunPayrollForm from './RunPayrollForm';

export const metadata = { title: 'Run Payroll | iBuyNaija' };

export default async function RunPayrollPage() {
  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const [{ rows: settings }, { rows: employees }, { rows: existingRuns }] = await Promise.all([
    pool.query(`SELECT 1 FROM payroll_settings WHERE seller_id = $1`, [sellerId]),
    pool.query(
      `SELECT id, name, salary_type FROM payroll_employees
       WHERE seller_id = $1 AND active = TRUE ORDER BY name`,
      [sellerId],
    ),
    pool.query(`SELECT period FROM payroll_runs WHERE seller_id = $1`, [sellerId]),
  ]);

  const dailyEmployees = employees.filter(e => e.salary_type === 'daily');
  const existingPeriods = existingRuns.map(r => r.period as string);

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '36px 24px' }}>
        <Link href="/dashboard/payroll" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none' }}>
          ‹ Back to payroll
        </Link>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '10px 0 4px' }}>
          Run payroll
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 24px' }}>
          Pick a month to calculate payslips and statutory remittances for all active employees.
        </p>

        {settings.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid rgba(193,84,44,0.3)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 6 }}>Set up payroll settings first</div>
            <Link href="/dashboard/payroll/settings" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A' }}>Go to payroll settings →</Link>
          </div>
        ) : employees.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid rgba(193,84,44,0.3)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 6 }}>Add an employee first</div>
            <Link href="/dashboard/payroll/employees" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A' }}>Go to employees →</Link>
          </div>
        ) : (
          <RunPayrollForm
            activeCount={employees.length}
            dailyEmployees={dailyEmployees.map(e => ({ id: e.id, name: e.name }))}
            existingPeriods={existingPeriods}
          />
        )}
      </main>
    </>
  );
}
