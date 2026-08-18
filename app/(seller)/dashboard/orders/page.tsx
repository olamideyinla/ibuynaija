import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';
import type { OrderStatus } from '@/types';

export const metadata = { title: 'Orders — Dashboard | iBuyNaija' };

const STATUS_ORDER: Record<string, number> = {
  payment_claimed: 0,
  awaiting_payment: 1,
  confirmed_by_seller: 2,
  fulfilled: 3,
  cancelled: 4,
};

export default async function SellerOrdersPage() {
  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { rows } = await pool.query(
    `SELECT
       o.id,
       o.total,
       o.status,
       o.date_created,
       cs.buyer_phone,
       cs.delivery_method,
       COUNT(li.value) AS item_count
     FROM orders o
     JOIN checkout_sessions cs ON cs.id = o.checkout_session_id
     CROSS JOIN LATERAL jsonb_array_elements(o.line_items) AS li(value)
     WHERE o.seller_id = $1
     GROUP BY o.id, cs.buyer_phone, cs.delivery_method
     ORDER BY o.date_created DESC`,
    [sellerId],
  );

  // Sort: active first (payment_claimed, awaiting_payment, confirmed), then fulfilled, then cancelled
  const sorted = [...rows].sort((a, b) => {
    const ao = STATUS_ORDER[a.status] ?? 99;
    const bo = STATUS_ORDER[b.status] ?? 99;
    if (ao !== bo) return ao - bo;
    return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
  });

  const active = sorted.filter((o) => !['fulfilled', 'cancelled'].includes(o.status));
  const done   = sorted.filter((o) =>  ['fulfilled', 'cancelled'].includes(o.status));

  function OrderRow({ o }: { o: typeof rows[0] }) {
    const rawPhone = o.buyer_phone as string;
    const maskedPhone = rawPhone ? rawPhone.slice(0, 7) + '****' + rawPhone.slice(-2) : '—';
    return (
      <Link href={`/dashboard/orders/${o.id}`} style={{ textDecoration: 'none' }}>
        <div style={{
          background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12,
          padding: '16px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: '#1B2A4A' }}>
                #{o.id.slice(0, 8).toUpperCase()}
              </span>
              <OrderStatusBadge status={o.status as OrderStatus} />
            </div>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span>{maskedPhone}</span>
              <span>·</span>
              <span>{o.item_count} item{parseInt(o.item_count) !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span style={{ textTransform: 'capitalize' }}>{o.delivery_method}</span>
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
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 4px' }}>
              Orders
            </h1>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: 0 }}>
              {rows.length} order{rows.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: '#8A7E66', margin: 0 }}>
              No orders yet. Orders will appear here once buyers purchase from your listings.
            </p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: '#1B2A4A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                  Active ({active.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {active.map((o) => <OrderRow key={o.id} o={o} />)}
                </div>
              </section>
            )}

            {done.length > 0 && (
              <section>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                  Completed / Cancelled ({done.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {done.map((o) => <OrderRow key={o.id} o={o} />)}
                </div>
              </section>
            )}
          </>
        )}

        <div style={{ marginTop: 28 }}>
          <Link href="/dashboard" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>
      </main>
    </>
  );
}
