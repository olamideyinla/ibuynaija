import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import ListingForm from '../ListingForm';

export const metadata = { title: 'New Listing | iBuyNaija' };

export default async function NewListingPage() {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { rows: categories } = await pool.query(
    `SELECT id, name FROM categories WHERE section = 'marketplace' ORDER BY sort_order`,
  );

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '36px 24px' }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 6px' }}>
          New listing
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 32px' }}>
          All listings must be Made in Nigeria.
        </p>
        <ListingForm categories={categories} />
      </main>
    </>
  );
}
