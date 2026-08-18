import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import type { PayrollSettingsRow } from '@/types';
import SettingsForm from './SettingsForm';

export const metadata = { title: 'Payroll Settings | iBuyNaija' };

export default async function PayrollSettingsPage() {
  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const [{ rows: settingsRows }, { rows: sellerRows }] = await Promise.all([
    pool.query<PayrollSettingsRow>(`SELECT * FROM payroll_settings WHERE seller_id = $1`, [sellerId]),
    pool.query(`SELECT state FROM sellers WHERE id = $1`, [sellerId]),
  ]);

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px' }}>
        <Link href="/dashboard/payroll" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none' }}>
          ‹ Back to payroll
        </Link>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '10px 0 4px' }}>
          Payroll settings
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 24px' }}>
          Employer details used across every payroll run. PAYE is remitted to your state revenue service.
        </p>
        <SettingsForm
          initial={settingsRows[0] ?? null}
          defaultState={sellerRows[0]?.state ?? null}
        />
      </main>
    </>
  );
}
