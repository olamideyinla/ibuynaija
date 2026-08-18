import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';
import RepublishButton from './RepublishButton';
import DeleteListingButton from './DeleteListingButton';

export const metadata = { title: 'My Listings | iBuyNaija' };

export default async function SellerListingsPage() {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { rows } = await pool.query(
    `SELECT
       l.id, l.title, l.status, l.price, l.condition, l.date_posted,
       COALESCE(SUM(lv.stock_count)::int, 0) AS total_stock,
       COUNT(lv.id)::int AS variant_count
     FROM listings l
     LEFT JOIN listing_variants lv ON lv.listing_id = l.id
     WHERE l.seller_id = $1
     GROUP BY l.id
     ORDER BY l.date_posted DESC`,
    [sellerId],
  );

  const STATUS_COLOR: Record<string, string> = {
    active: '#2E7D32', sold: '#C1542C', expired: '#8A7E66',
  };

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 4px' }}>
              My Listings
            </h1>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: 0 }}>
              {rows.length} listing{rows.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/dashboard/listings/new" style={{
            background: '#1B2A4A', color: '#F7F1E3',
            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
            padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
          }}>
            + New listing
          </Link>
        </div>

        {rows.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: '#8A7E66', margin: '0 0 16px' }}>
              You have no listings yet.
            </p>
            <Link href="/dashboard/listings/new" style={{ color: '#1B2A4A', fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif" }}>
              Create your first listing →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rows.map((l) => (
              <div key={l.id} style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A' }}>
                      {l.title}
                    </span>
                    <span style={{
                      fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600,
                      color: STATUS_COLOR[l.status] ?? '#8A7E66',
                      background: `${STATUS_COLOR[l.status] ?? '#8A7E66'}18`,
                      padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      {l.status}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>{formatNaira(l.price) ?? 'Price on request'}</span>
                    <span>·</span>
                    <span>{l.total_stock} in stock</span>
                    {l.variant_count > 1 && <><span>·</span><span>{l.variant_count} variants</span></>}
                    <span>·</span>
                    <span>{new Date(l.date_posted).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {l.status === 'expired' && <RepublishButton listingId={l.id} />}
                  <Link href={`/listing/${l.id}`} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none', padding: '6px 12px', border: '1px solid rgba(27,42,74,0.15)', borderRadius: 6 }}>
                    View
                  </Link>
                  <Link href={`/dashboard/listings/${l.id}/stock`} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A', textDecoration: 'none', fontWeight: 600, padding: '6px 12px', border: '1px solid rgba(27,42,74,0.2)', borderRadius: 6 }}>
                    Stock
                  </Link>
                  <Link href={`/dashboard/listings/${l.id}/edit`} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A', textDecoration: 'none', fontWeight: 600, padding: '6px 12px', border: '1px solid rgba(27,42,74,0.2)', borderRadius: 6 }}>
                    Edit
                  </Link>
                  <DeleteListingButton listingId={l.id} title={l.title} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <Link href="/dashboard" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>
      </main>
    </>
  );
}
