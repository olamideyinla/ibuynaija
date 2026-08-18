import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import { pool } from '@/lib/db';
import { BUYER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';
import type { OrderStatus } from '@/types';

export const metadata = { title: 'My Orders | iBuyNaija' };

export default async function BuyerOrdersPage() {
  const store = await cookies();
  const buyerId = store.get(BUYER_COOKIE)?.value ?? null;
  if (!buyerId) redirect('/login');

  const { rows } = await pool.query(
    `SELECT
       o.id,
       o.total,
       o.status,
       o.date_created,
       s.business_name,
       s.slug AS seller_slug,
       COUNT(li.value) AS item_count
     FROM orders o
     JOIN sellers s ON s.id = o.seller_id
     CROSS JOIN LATERAL jsonb_array_elements(o.line_items) AS li(value)
     WHERE o.buyer_id = $1
     GROUP BY o.id, s.business_name, s.slug
     ORDER BY o.date_created DESC`,
    [buyerId],
  );

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 4px' }}>
          My Orders
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 28px' }}>
          {rows.length} order{rows.length !== 1 ? 's' : ''}
        </p>

        {rows.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: '#8A7E66', margin: '0 0 16px' }}>
              You have not placed any orders yet.
            </p>
            <Link href="/" style={{ color: '#1B2A4A', fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", textDecoration: 'none' }}>
              Start shopping →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rows.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12,
                  padding: '16px 20px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 16,
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: '#1B2A4A' }}>
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                      <OrderStatusBadge status={o.status as OrderStatus} />
                    </div>
                    <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>{o.business_name}</span>
                      <span>·</span>
                      <span>{o.item_count} item{parseInt(o.item_count) !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{new Date(o.date_created).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A' }}>
                      {formatNaira(parseFloat(o.total))}
                    </span>
                    <span style={{ color: '#8A7E66', fontSize: 18 }}>›</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
