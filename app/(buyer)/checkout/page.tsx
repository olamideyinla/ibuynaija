import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { BUYER_COOKIE } from '@/lib/cookie';
import CheckoutForm from './CheckoutForm';
import { formatNaira } from '@/lib/format';
import { ACTIVE_PROMO_LATERAL, effectivePriceSql } from '@/lib/promotions';

export const metadata = { title: 'Checkout | iBuyNaija' };

export default async function CheckoutPage() {
  const store = await cookies();
  const buyerId = store.get(BUYER_COOKIE)?.value ?? null;

  if (!buyerId) redirect('/login');

  const [{ rows }, { rows: userRows }] = await Promise.all([
    pool.query(
      `SELECT
         ci.id,
         ci.quantity,
         l.title,
         l.status,
         s.id              AS seller_id,
         s.business_name,
         s.delivery_zones,
         COALESCE(lv.price_override, l.price)                AS original_price,
         ${effectivePriceSql('COALESCE(lv.price_override, l.price)')} AS price
       FROM cart_items ci
       JOIN listings         l  ON l.id  = ci.listing_id
       JOIN listing_variants lv ON lv.id = ci.variant_id
       JOIN sellers          s  ON s.id  = l.seller_id
       ${ACTIVE_PROMO_LATERAL('l')}
       WHERE ci.buyer_id = $1
       ORDER BY ci.added_at ASC`,
      [buyerId],
    ),
    pool.query(
      `SELECT COALESCE(saved_delivery_addresses, '{}') AS addresses FROM users WHERE id = $1`,
      [buyerId],
    ),
  ]);

  if (rows.length === 0) redirect('/cart');

  const savedAddresses = (userRows[0]?.addresses ?? []) as string[];

  // Group by seller using effective (post-promotion) price
  const bySeller = new Map<string, {
    sellerName: string;
    itemCount: number;
    subtotal: number;
    deliveryZones: Record<string, number>;
  }>();
  for (const r of rows) {
    const entry = bySeller.get(r.seller_id) ?? {
      sellerName: r.business_name,
      itemCount: 0,
      subtotal: 0,
      deliveryZones: (r.delivery_zones ?? {}) as Record<string, number>,
    };
    entry.itemCount += r.quantity;
    entry.subtotal  += parseFloat(r.price ?? r.original_price ?? '0') * r.quantity;
    bySeller.set(r.seller_id, entry);
  }

  const sellerGroups = Array.from(bySeller.entries()).map(([sellerId, v]) => ({
    sellerId,
    ...v,
  }));

  const grandTotal = sellerGroups.reduce((s, g) => s + g.subtotal, 0);

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 28,
            color: '#1B2A4A',
            marginBottom: 8,
          }}
        >
          Checkout
        </h1>
        <p
          style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 14,
            color: '#8A7E66',
            marginBottom: 32,
          }}
        >
          Grand total: <strong style={{ color: '#1B2A4A' }}>{formatNaira(grandTotal)}</strong>
          {sellerGroups.length > 1 && ` across ${sellerGroups.length} sellers`}
        </p>
        <CheckoutForm sellerGroups={sellerGroups} grandTotal={grandTotal} savedAddresses={savedAddresses} />
      </main>
    </>
  );
}
