import { cookies } from 'next/headers';
import Navbar from '@/components/Navbar';
import CartView from './CartView';
import { pool } from '@/lib/db';
import { BUYER_COOKIE } from '@/lib/cookie';

export const metadata = { title: 'Your Cart | iBuyNaija' };

export default async function CartPage() {
  const store = await cookies();
  const buyerId = store.get(BUYER_COOKIE)?.value ?? null;

  if (!buyerId) {
    return (
      <>
        <Navbar />
        <main style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 16, color: '#8A7E66' }}>
            Sign in to view your cart.
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              marginTop: 16,
              background: '#1B2A4A',
              color: '#F7F1E3',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              padding: '12px 24px',
              borderRadius: 10,
              textDecoration: 'none',
            }}
          >
            Sign In
          </a>
        </main>
      </>
    );
  }

  const { rows } = await pool.query(
    `SELECT
       ci.id,
       ci.buyer_id,
       ci.listing_id,
       ci.quantity,
       ci.added_at,
       l.title,
       l.price,
       l.photos,
       l.status        AS listing_status,
       l.condition,
       l.status <> 'active' AS is_stale,
       s.id            AS seller_id,
       s.business_name,
       s.slug          AS seller_slug,
       s.state         AS seller_state,
       s.city_area     AS seller_city,
       s.verified_status
     FROM cart_items ci
     JOIN listings l ON l.id = ci.listing_id
     JOIN sellers  s ON s.id = l.seller_id
     WHERE ci.buyer_id = $1
     ORDER BY ci.added_at ASC`,
    [buyerId],
  );

  const items = rows.map((r) => ({
    id: r.id,
    buyer_id: r.buyer_id,
    listing_id: r.listing_id,
    quantity: r.quantity,
    added_at: r.added_at,
    is_stale: r.is_stale,
    listing: {
      id: r.listing_id,
      title: r.title,
      price: r.price,
      photos: r.photos,
      status: r.listing_status,
      condition: r.condition,
      seller: {
        id: r.seller_id,
        business_name: r.business_name,
        slug: r.seller_slug,
        state: r.seller_state,
        city_area: r.seller_city,
        verified_status: r.verified_status,
      },
    },
  }));

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 28,
            color: '#1B2A4A',
            marginBottom: 28,
          }}
        >
          Your Cart
          {items.length > 0 && (
            <span
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontWeight: 400,
                fontSize: 16,
                color: '#8A7E66',
                marginLeft: 12,
              }}
            >
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          )}
        </h1>
        <CartView initialItems={items} />
      </main>
    </>
  );
}
