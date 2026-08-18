import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Navbar from '@/components/Navbar';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import RatingForm from '@/components/RatingForm';
import { pool } from '@/lib/db';
import { BUYER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';
import type { OrderStatus, OrderLineItem } from '@/types';
import ClaimPaymentPanel from './ClaimPaymentPanel';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Order #${id.slice(0, 8).toUpperCase()} | iBuyNaija` };
}

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;
  const store = await cookies();
  const buyerId = store.get(BUYER_COOKIE)?.value ?? null;

  if (!buyerId) redirect('/login');

  const [{ rows }, { rows: ratedRows }] = await Promise.all([
    pool.query(
      `SELECT
         o.id,
         o.buyer_id,
         o.seller_id,
         o.line_items,
         o.total,
         o.delivery_fee,
         o.status,
         o.receipt_attachment_url,
         o.date_created,
         o.date_updated,
         s.business_name,
         s.slug            AS seller_slug,
         s.state           AS seller_state,
         s.city_area       AS seller_city,
         s.verified_status,
         s.bank_account_name,
         s.bank_account_number,
         s.bank_name,
         s.whatsapp_number AS seller_whatsapp,
         cs.delivery_method,
         cs.delivery_address,
         cs.buyer_phone,
         cs.buyer_email
       FROM orders o
       JOIN sellers           s  ON s.id  = o.seller_id
       JOIN checkout_sessions cs ON cs.id = o.checkout_session_id
       WHERE o.id = $1`,
      [id],
    ),
    // Pre-fetch which listing IDs the buyer has already rated (for rating form gating)
    pool.query(
      `SELECT listing_id FROM ratings WHERE buyer_id = $1`,
      [buyerId],
    ),
  ]);

  if (rows.length === 0) notFound();

  const r = rows[0];

  if (r.buyer_id !== buyerId) {
    // Not this buyer's order
    redirect('/');
  }

  const order = {
    id: r.id,
    buyer_id: r.buyer_id,
    seller_id: r.seller_id,
    line_items: r.line_items as OrderLineItem[],
    total: parseFloat(r.total),
    delivery_fee: parseFloat(r.delivery_fee ?? '0'),
    status: r.status as OrderStatus,
    receipt_attachment_url: r.receipt_attachment_url as string | null,
    date_created: r.date_created as string,
  };

  const seller = {
    business_name: r.business_name as string,
    bank_account_name: r.bank_account_name as string | null,
    bank_account_number: r.bank_account_number as string | null,
    bank_name: r.bank_name as string | null,
    whatsapp_number: r.seller_whatsapp as string | null,
  };

  const alreadyRatedIds = new Set(ratedRows.map((r: { listing_id: string }) => r.listing_id));
  const shortId = id.slice(0, 8).toUpperCase();

  const STATUS_STEPS: OrderStatus[] = [
    'awaiting_payment',
    'payment_claimed',
    'confirmed_by_seller',
    'fulfilled',
  ];
  const currentStepIdx = order.status === 'cancelled'
    ? -1
    : STATUS_STEPS.indexOf(order.status);

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

        {/* Status stepper */}
        {order.status !== 'cancelled' && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, overflowX: 'auto' }}>
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStepIdx;
              const active = i === currentStepIdx;
              const labels: Record<string, string> = {
                awaiting_payment: 'Awaiting Payment',
                payment_claimed: 'Payment Claimed',
                confirmed_by_seller: 'Confirmed',
                fulfilled: 'Fulfilled',
              };
              return (
                <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? '1' : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: done ? '#1B2A4A' : 'rgba(27,42,74,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12,
                      color: done ? '#F7F1E3' : '#8A7E66',
                      border: active ? '2px solid #C1542C' : 'none',
                    }}>
                      {done && !active ? '✓' : i + 1}
                    </div>
                    <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: done ? '#1B2A4A' : '#8A7E66', whiteSpace: 'nowrap', fontWeight: active ? 700 : 400 }}>
                      {labels[step]}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: i < currentStepIdx ? '#1B2A4A' : 'rgba(27,42,74,0.12)', margin: '0 4px', marginBottom: 20 }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {order.status === 'cancelled' && (
          <div style={{ background: 'rgba(138,126,102,0.1)', borderRadius: 10, padding: '12px 16px', marginBottom: 28, fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#8A7E66' }}>
            This order was cancelled.
          </div>
        )}

        {/* Bank details — gold box, shown always (buyer needs them to pay) */}
        <div
          style={{
            border: '2px solid #D9A02D',
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 28,
            background: 'rgba(217,160,45,0.05)',
          }}
        >
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: '#D9A02D', marginBottom: 14, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            🏦 Bank Transfer Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
            <div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Bank</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A' }}>{seller.bank_name ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Account Number</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: '#1B2A4A', letterSpacing: 2 }}>{seller.bank_account_number ?? '—'}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Account Name</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: '#1B2A4A' }}>{seller.bank_account_name ?? '—'}</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid rgba(217,160,45,0.3)',
            }}
          >
            {order.delivery_fee > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#8A7E66' }}>Items</span>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: '#1B2A4A' }}>{formatNaira(order.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#8A7E66' }}>Delivery</span>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: '#1B2A4A' }}>{formatNaira(order.delivery_fee)}</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(217,160,45,0.25)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#8A7E66' }}>Total due</span>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 24, color: '#1B2A4A' }}>{formatNaira(order.total + order.delivery_fee)}</span>
                </div>
              </>
            )}
            {order.delivery_fee === 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#8A7E66' }}>Amount to transfer</span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 24, color: '#1B2A4A' }}>{formatNaira(order.total)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '20px 24px', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 16 }}>
            Items from {seller.business_name}
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

        {/* Rating forms — shown for fulfilled orders, one per unique listing */}
        {order.status === 'fulfilled' && (() => {
          const uniqueListings = Array.from(
            new Map(order.line_items.map((li) => [li.listing_id, li.title])).entries(),
          );
          const ratable = uniqueListings.filter(([lid]) => !alreadyRatedIds.has(lid));
          if (ratable.length === 0) return null;
          return (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 14 }}>
                Leave a rating
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ratable.map(([lid, title]) => (
                  <RatingForm key={lid} listingId={lid} listingTitle={title} />
                ))}
              </div>
            </div>
          );
        })()}

        {/* Claim panel — shown only when awaiting payment */}
        {order.status === 'awaiting_payment' && (
          <ClaimPaymentPanel
            orderId={order.id}
            total={order.total}
            deliveryFee={order.delivery_fee}
            businessName={seller.business_name}
            sellerWhatsapp={seller.whatsapp_number}
            shortId={shortId}
          />
        )}

        {/* Message Seller */}
        <div style={{ marginTop: 24 }}>
          <a
            href={`/messages/order/${order.id}`}
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
            Message Seller
          </a>
          <span style={{ display: 'inline-block', marginLeft: 12, fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, color: '#8A7E66', verticalAlign: 'middle' }}>
            Have a question about your order? Message {seller.business_name} directly.
          </span>
        </div>

        {/* Receipt link if present */}
        {order.receipt_attachment_url && (
          <div style={{ marginTop: 20, fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: '#8A7E66' }}>
            Receipt submitted:{' '}
            <a href={order.receipt_attachment_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1B2A4A', fontWeight: 600 }}>
              View receipt
            </a>
          </div>
        )}
      </main>
    </>
  );
}
