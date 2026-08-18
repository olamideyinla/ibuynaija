import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { SELLER_COOKIE } from '@/lib/cookie';
import RevenueDashboard from './RevenueDashboard';

export const metadata = { title: 'Revenue & Expense Summary | iBuyNaija' };

export default async function RevenuePage() {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/dashboard" style={{
            fontFamily: "'Hanken Grotesk',sans-serif",
            fontSize: 13, color: '#8A7E66', textDecoration: 'none',
          }}>
            ← Dashboard
          </Link>
        </div>

        <div style={{ marginBottom: 8 }}>
          <h1 style={{
            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
            fontSize: 26, color: '#1B2A4A', margin: 0,
          }}>
            Revenue &amp; Expense Summary
          </h1>
        </div>

        {/* Framing notice — always visible, above the fold */}
        <div style={{
          background: 'rgba(193,84,44,0.06)',
          border: '1px solid rgba(193,84,44,0.25)',
          borderRadius: 10,
          padding: '12px 18px',
          marginBottom: 28,
          fontFamily: "'Hanken Grotesk',sans-serif",
          fontSize: 13,
          color: '#7A3317',
          lineHeight: 1.55,
        }}>
          <strong>Sales tracker — not accounting software.</strong> Figures here are
          self-reported by you and have not been independently verified by iBuyNaija.
          Platform Orders reflect a buyer&apos;s payment <em>claim</em>, not confirmed receipt
          of funds. Profit is an estimate. Do not use this for tax filings or audits.
        </div>

        <RevenueDashboard />
      </main>
    </>
  );
}
