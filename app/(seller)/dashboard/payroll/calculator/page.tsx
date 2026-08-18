import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { SELLER_COOKIE } from '@/lib/cookie';
import GrossUpCalculator from './GrossUpCalculator';

export const metadata = { title: 'Salary Quick Check | iBuyNaija' };

export default async function PayrollCalculatorPage() {
  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px' }}>
        <Link href="/dashboard/payroll" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none' }}>
          ‹ Back to payroll
        </Link>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '10px 0 4px' }}>
          Salary quick check
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 24px', lineHeight: 1.5 }}>
          Enter the monthly take-home you want an employee to receive, and this works out the gross salary you
          need to set, plus the tax and statutory deductions along the way.
        </p>
        <GrossUpCalculator />
      </main>
    </>
  );
}
