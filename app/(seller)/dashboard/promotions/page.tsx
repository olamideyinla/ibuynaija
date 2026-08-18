import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';
import EndPromoButton from './EndPromoButton';
import DeletePromoButton from './DeletePromoButton';

export const metadata = { title: 'Promotions | iBuyNaija' };

type PromoStatus = 'active' | 'upcoming' | 'expired';

interface PromoRow {
  id: string;
  scope: 'single_listing' | 'all_listings';
  listing_id: string | null;
  listing_title: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  start_date: string;
  end_date: string;
  status: PromoStatus;
}

const STATUS_COLOR: Record<PromoStatus, string> = {
  active:   '#2E7D32',
  upcoming: '#9B6F00',
  expired:  '#8A7E66',
};

function formatDiscount(type: 'percentage' | 'fixed_amount', value: number): string {
  return type === 'percentage'
    ? `${value}% off`
    : `${formatNaira(value) ?? `₦${value}`} off`;
}

export default async function PromotionsPage() {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { rows } = await pool.query<PromoRow>(
    `SELECT
       p.id, p.scope, p.listing_id,
       p.discount_type, p.discount_value::float AS discount_value,
       p.start_date::text, p.end_date::text,
       l.title AS listing_title,
       CASE
         WHEN NOW() < p.start_date THEN 'upcoming'
         WHEN NOW() > p.end_date   THEN 'expired'
         ELSE 'active'
       END AS status
     FROM promotions p
     LEFT JOIN listings l ON l.id = p.listing_id
     WHERE p.seller_id = $1
     ORDER BY
       CASE WHEN NOW() BETWEEN p.start_date AND p.end_date THEN 0
            WHEN NOW() < p.start_date THEN 1
            ELSE 2 END,
       p.start_date DESC`,
    [sellerId],
  );

  const groups: Record<PromoStatus, PromoRow[]> = {
    active:   rows.filter((r) => r.status === 'active'),
    upcoming: rows.filter((r) => r.status === 'upcoming'),
    expired:  rows.filter((r) => r.status === 'expired'),
  };

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 4px' }}>
              Promotions
            </h1>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: 0 }}>
              Discounts apply automatically — no coupon codes.
            </p>
          </div>
          <Link
            href="/dashboard/promotions/new"
            style={{
              background: '#1B2A4A', color: '#F7F1E3',
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
              padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
            }}
          >
            + New promotion
          </Link>
        </div>

        {rows.length === 0 && (
          <div style={{
            background: '#fff', border: '1px solid rgba(27,42,74,0.08)',
            borderRadius: 12, padding: '40px 24px', textAlign: 'center',
          }}>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: '#8A7E66', margin: '0 0 16px' }}>
              No promotions yet.
            </p>
            <Link
              href="/dashboard/promotions/new"
              style={{ color: '#1B2A4A', fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif" }}
            >
              Create your first promotion →
            </Link>
          </div>
        )}

        {(['active', 'upcoming', 'expired'] as PromoStatus[]).map((status) => {
          const group = groups[status];
          if (group.length === 0) return null;
          return (
            <div key={status} style={{ marginBottom: 32 }}>
              <h2 style={{
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13,
                letterSpacing: 1.5, textTransform: 'uppercase',
                color: STATUS_COLOR[status], margin: '0 0 12px',
              }}>
                {status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Expired'}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: '#fff',
                      border: `1px solid ${status === 'active' ? 'rgba(46,125,50,0.25)' : 'rgba(27,42,74,0.08)'}`,
                      borderRadius: 12, padding: '14px 18px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
                          fontSize: 15, color: status === 'expired' ? '#8A7E66' : '#1B2A4A',
                        }}>
                          {formatDiscount(p.discount_type, p.discount_value)}
                        </span>
                        <span style={{
                          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600,
                          color: STATUS_COLOR[status],
                          background: `${STATUS_COLOR[status]}18`,
                          padding: '2px 8px', borderRadius: 4,
                          textTransform: 'uppercase', letterSpacing: 0.5,
                        }}>
                          {status}
                        </span>
                      </div>
                      <div style={{
                        fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66',
                        display: 'flex', flexWrap: 'wrap', gap: 8,
                      }}>
                        <span>
                          {p.scope === 'all_listings'
                            ? 'All listings'
                            : (p.listing_title ?? 'Single listing')}
                        </span>
                        <span>·</span>
                        <span>
                          {new Date(p.start_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {' → '}
                          {new Date(p.end_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    {status === 'active'   && <EndPromoButton   promotionId={p.id} />}
                    {status === 'upcoming' && <DeletePromoButton promotionId={p.id} />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 8 }}>
          <Link
            href="/dashboard"
            style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none' }}
          >
            ← Dashboard
          </Link>
        </div>
      </main>
    </>
  );
}
