import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import PromotionForm from '../PromotionForm';

export const metadata = { title: 'New Promotion | iBuyNaija' };

export default async function NewPromotionPage() {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  // Fetch active listings this seller can promote
  const { rows: listings } = await pool.query(
    `SELECT id, title FROM listings WHERE seller_id = $1 AND status = 'active' ORDER BY date_posted DESC`,
    [sellerId],
  );

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/dashboard/promotions"
            style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none' }}
          >
            ← Promotions
          </Link>
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 6px' }}>
          New promotion
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 32px' }}>
          Discounts apply automatically to buyers — no coupon codes needed.
        </p>
        <PromotionForm listings={listings} />
      </main>
    </>
  );
}
