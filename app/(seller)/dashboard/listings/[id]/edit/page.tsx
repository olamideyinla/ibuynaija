import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import ListingForm from '../../ListingForm';

export const metadata = { title: 'Edit Listing | iBuyNaija' };

interface PageProps { params: Promise<{ id: string }> }

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const [{ rows: [listing] }, { rows: variants }, { rows: categories }] = await Promise.all([
    pool.query(
      `SELECT id, title, description, category_id, price::text AS price,
              condition, photos, cover_photo_index, seller_id
       FROM listings WHERE id = $1`,
      [id],
    ),
    pool.query(
      `SELECT id, attributes, price_override, stock_count
       FROM listing_variants WHERE listing_id = $1 ORDER BY id`,
      [id],
    ),
    pool.query(
      `SELECT id, name FROM categories WHERE section = 'marketplace' ORDER BY sort_order`,
    ),
  ]);

  if (!listing) notFound();
  if (listing.seller_id !== sellerId) redirect('/dashboard/listings');

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '36px 24px' }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 6px' }}>
          Edit listing
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 32px' }}>
          Changes to variants (stock, price overrides) are saved immediately per variant.
        </p>
        <ListingForm
          categories={categories}
          initial={{
            id: listing.id,
            title: listing.title,
            description: listing.description,
            category_id: listing.category_id,
            price: listing.price ?? '',
            condition: listing.condition,
            photos: listing.photos,
            cover_photo_index: listing.cover_photo_index ?? 0,
            variants: variants.map(v => ({
              id: v.id,
              attributes: v.attributes ?? {},
              price_override: v.price_override != null ? parseFloat(v.price_override) : null,
              stock_count: parseInt(v.stock_count),
            })),
          }}
        />
      </main>
    </>
  );
}
