import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Navbar from '@/components/Navbar';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';
import type { OrderStatus, OrderLineItem } from '@/types';
import SellerOrderActions from './SellerOrderActions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Order #${id.slice(0, 8).toUpperCase()} — Seller Dashboard | iBuyNaija` };
}

export default async function SellerOrderPage({ params }: PageProps) {
  const { id } = await params;
  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;

  if (!sellerId) redirect('/login');

  const [{ rows }, priorResult] = await Promise.all([
    pool.query(
      `SELECT
         o.id,
         o.buyer_id,
         o.seller_id,
         o.line_items,
         o.total,
         o.status,
         o.receipt_attachment_url,
         o.date_created,
         o.date_updated,
         cs.delivery_method,
         cs.delivery_address,
         cs.buyer_phone,
         cs.buyer_email
       FROM orders o
       JOIN checkout_sessions cs ON cs.id = o.checkout_session_id
       WHERE o.id = $1`,
      [id],
    ),
    // Prior-order count fetched speculatively; re-checked after auth below.
    // Count prior non-cancelled orders this buyer placed with this seller,
    // excluding the current order being viewed.
    pool.query<{ prior_count: string }>(
      `SELECT COUNT(*) AS prior_count
       FROM orders
       WHERE buyer_id  = (SELECT buyer_id  FROM orders WHERE id = $1)
         AND seller_id = (SELECT seller_id FROM orders WHERE id = $1)
         AND id       != $1
         AND status   != 'cancelled'`,
      [id],
    ),
  ]);

  if (rows.length === 0) notFound();

  const r = rows[0];

  if (r.seller_id !== sellerId) redirect('/seller/dashboard');

  const priorOrderCount = parseInt(priorResult.rows[0]?.prior_count ?? '0', 10);

  const order = {
    id: r.id,
    buyer_id: r.buyer_id,
    seller_id: r.seller_id,
    line_items: r.line_items as OrderLineItem[],
    total: parseFloat(r.total),
    status: r.status as OrderStatus,
    receipt_attachment_url: r.receipt_attachment_url as string | null,
    date_created: r.date_created as string,
  };

  const shortId = id.slice(0, 8).toUpperCase();

  // Mask buyer phone: show first 7 chars, mask rest
  const rawPhone = r.buyer_phone as string;
  const maskedPhone = rawPhone
    ? rawPhone.slice(0, 7) + '****' + rawPhone.slice(-2)
    : '—';

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: 0 }}>
              Order #{shortId}
            </h1>
            <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: '#8A7E66', margin: '6px 0 0' }}>
              Placed {new Date(order.date_created).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Buyer contact (phone masked) */}
        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(27,42,74,0.08)',
            borderRadius: 14,
            padding: '18px 24px',
            marginBottom: 24,
          }}
        >
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Buyer Contact
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
            <div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: '#8A7E66', marginBottom: 2 }}>Phone</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: '#1B2A4A' }}>{maskedPhone}</div>
            </div>
            {r.buyer_email && (
              <div>
                <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: '#8A7E66', marginBottom: 2 }}>Email</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: '#1B2A4A' }}>{r.buyer_email}</div>
              </div>
            )}
            <div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: '#8A7E66', marginBottom: 2 }}>Delivery</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: '#1B2A4A', textTransform: 'capitalize' }}>{r.delivery_method}</div>
            </div>
            {r.delivery_address && (
              <div>
                <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: '#8A7E66', marginBottom: 2 }}>Address</div>
                <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#1B2A4A' }}>{r.delivery_address}</div>
              </div>
            )}
          </div>

          {/* Repeat-buyer indicator */}
          <div style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid rgba(27,42,74,0.07)',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13,
            color: priorOrderCount === 0 ? '#8A7E66' : '#2E7D32',
          }}>
            {priorOrderCount === 0
              ? 'First order from this buyer with you.'
              : `This buyer has ordered from you ${priorOrderCount} time${priorOrderCount === 1 ? '' : 's'} before.`}
          </div>
        </div>

        {/* Line items */}
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 16 }}>
            Items
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(27,42,74,0.08)' }}>
                {['Item', 'Qty', 'Unit Price', 'Subtotal'].map((h) => (
                  <th key={h} style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: h === 'Item' ? 'left' : 'right', padding: '0 0 10px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.line_items.map((li, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(27,42,74,0.05)' }}>
                  <td style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#1B2A4A', padding: '10px 0' }}>{li.title}</td>
                  <td style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#8A7E66', textAlign: 'right', padding: '10px 0' }}>{li.qty}</td>
                  <td style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#8A7E66', textAlign: 'right', padding: '10px 0' }}>{formatNaira(li.unit_price)}</td>
                  <td style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: '#1B2A4A', textAlign: 'right', padding: '10px 0' }}>{formatNaira(li.qty * li.unit_price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: '#1B2A4A', paddingTop: 12, textAlign: 'right' }}>Total</td>
                <td style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#1B2A4A', paddingTop: 12, textAlign: 'right' }}>{formatNaira(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Message Buyer */}
        <div style={{ marginBottom: 24 }}>
          <a
            href={`/dashboard/messages/order/${order.id}`}
            style={{
              display: 'inline-block',
              background: '#fff',
              border: '1px solid #1B2A4A',
              color: '#1B2A4A',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              padding: '11px 22px',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Message Buyer
          </a>
        </div>

        {/* Seller actions (client component) */}
        <SellerOrderActions
          orderId={order.id}
          currentStatus={order.status}
          receiptUrl={order.receipt_attachment_url}
          onStatusChange={() => {}}
        />
      </main>
    </>
  );
}
