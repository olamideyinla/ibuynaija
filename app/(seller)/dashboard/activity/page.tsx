import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import ActivityManager from './ActivityManager';

export const metadata = { title: 'Business Activity | iBuyNaija' };

export default async function ActivityPage() {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  // Fetch seller's active listings for the listing picker
  const { rows: listings } = await pool.query(
    `SELECT id, title FROM listings WHERE seller_id = $1 AND status = 'active' ORDER BY date_posted DESC`,
    [sellerId],
  );

  // Initial offline sales (last 50)
  const { rows: sales } = await pool.query(
    `SELECT
       os.id, os.amount::float, os.date::text, os.note,
       os.listing_id, os.variant_id, os.quantity, os.date_created::text,
       l.title AS listing_title,
       lv.attributes AS variant_attributes
     FROM offline_sales os
     LEFT JOIN listings l ON l.id = os.listing_id
     LEFT JOIN listing_variants lv ON lv.id = os.variant_id
     WHERE os.seller_id = $1
     ORDER BY os.date DESC, os.date_created DESC
     LIMIT 50`,
    [sellerId],
  );

  // Initial expenses (last 50)
  const { rows: expenses } = await pool.query(
    `SELECT id, amount::float, date::text, category, note, date_created::text
     FROM expenses
     WHERE seller_id = $1
     ORDER BY date DESC, date_created DESC
     LIMIT 50`,
    [sellerId],
  );

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/dashboard" style={{
            fontFamily: "'Hanken Grotesk',sans-serif",
            fontSize: 13, color: '#8A7E66', textDecoration: 'none',
          }}>
            ← Dashboard
          </Link>
        </div>

        <h1 style={{
          fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
          fontSize: 26, color: '#1B2A4A', margin: '0 0 8px',
        }}>
          Business Activity
        </h1>
        <p style={{
          fontFamily: "'Hanken Grotesk',sans-serif",
          fontSize: 14, color: '#8A7E66', margin: '0 0 32px', lineHeight: 1.6,
        }}>
          Log sales and expenses that happen outside iBuyNaija — for your own records only.
          <strong> This is self-reported data and is not verified or audited by iBuyNaija.</strong>
        </p>

        <ActivityManager
          listings={listings}
          initialSales={sales}
          initialExpenses={expenses}
        />
      </main>
    </>
  );
}
