import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import StockManager from './StockManager';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { rows } = await pool.query(
    `SELECT title FROM listings WHERE id = $1`,
    [id],
  );
  return { title: rows[0] ? `Stock: ${rows[0].title} | iBuyNaija` : 'Stock Management | iBuyNaija' };
}

export default async function StockPage({ params }: PageProps) {
  const { id: listingId } = await params;

  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  // Fetch listing + variants owned by this seller
  const { rows: listingRows } = await pool.query(
    `SELECT l.id, l.title
     FROM listings l
     WHERE l.id = $1 AND l.seller_id = $2`,
    [listingId, sellerId],
  );
  if (listingRows.length === 0) notFound();
  const listing = listingRows[0];

  const { rows: variants } = await pool.query(
    `SELECT id, attributes, stock_count, is_available, low_stock_threshold
     FROM listing_variants
     WHERE listing_id = $1
     ORDER BY id`,
    [listingId],
  );

  // Fetch recent stock events (last 50)
  const { rows: events } = await pool.query(
    `SELECT
       se.id,
       se.variant_id,
       se.change_type,
       se.quantity_delta,
       se.reason,
       se.date_created::text
     FROM stock_events se
     JOIN listing_variants lv ON lv.id = se.variant_id
     WHERE lv.listing_id = $1
     ORDER BY se.date_created DESC
     LIMIT 50`,
    [listingId],
  );

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/dashboard/listings" style={{
            fontFamily: "'Hanken Grotesk',sans-serif",
            fontSize: 13, color: '#8A7E66', textDecoration: 'none',
          }}>
            ← My Listings
          </Link>
        </div>

        <h1 style={{
          fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
          fontSize: 24, color: '#1B2A4A', margin: '0 0 4px',
        }}>
          Stock Management
        </h1>
        <p style={{
          fontFamily: "'Hanken Grotesk',sans-serif",
          fontSize: 14, color: '#8A7E66', margin: '0 0 32px',
        }}>
          {listing.title}
        </p>

        <StockManager
          listingId={listingId}
          variants={variants}
          events={events}
        />
      </main>
    </>
  );
}
