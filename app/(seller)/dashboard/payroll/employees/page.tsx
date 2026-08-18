import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import type { PayrollEmployeeRow } from '@/types';
import EmployeesManager from './EmployeesManager';

export const metadata = { title: 'Payroll Employees | iBuyNaija' };

export default async function PayrollEmployeesPage() {
  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { rows } = await pool.query<PayrollEmployeeRow>(
    `SELECT * FROM payroll_employees WHERE seller_id = $1 ORDER BY active DESC, name`,
    [sellerId],
  );

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>
        <Link href="/dashboard/payroll" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none' }}>
          ‹ Back to payroll
        </Link>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '10px 0 4px' }}>
          Employees
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 24px' }}>
          Add each member of staff and their monthly salary. Only active employees are included when you run payroll.
        </p>
        <EmployeesManager initial={rows} />
      </main>
    </>
  );
}
