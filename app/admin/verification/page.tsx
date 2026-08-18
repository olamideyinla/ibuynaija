import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin-auth';
import { pool } from '@/lib/db';

export const metadata = { title: 'Verification Queue — Admin | iBuyNaija' };

export default async function AdminVerificationPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { rows } = await pool.query(
    `SELECT
       s.id, s.business_name, s.state, s.city_area,
       s.verified_status, s.verification_requested, s.verified_date,
       u.email AS owner_email,
       COUNT(DISTINCT l.id) AS listing_count
     FROM sellers s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN listings l ON l.seller_id = s.id
     WHERE s.verification_requested = true OR s.verified_status = true
     GROUP BY s.id, s.business_name, s.state, s.city_area,
              s.verified_status, s.verification_requested, s.verified_date, u.email
     ORDER BY
       CASE WHEN s.verification_requested AND NOT s.verified_status THEN 0 ELSE 1 END,
       s.verified_date DESC NULLS LAST`,
  );

  const pending  = rows.filter((r) => r.verification_requested && !r.verified_status);
  const verified = rows.filter((r) => r.verified_status);

  function SellerRow({ r }: { r: typeof rows[0] }) {
    return (
      <Link href={`/admin/verification/${r.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 3 }}>
              {r.business_name}
            </div>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
              {r.city_area}, {r.state} · {r.owner_email} · {parseInt(r.listing_count)} listing{r.listing_count !== '1' ? 's' : ''}
            </div>
          </div>
          <span style={{ color: '#8A7E66', fontSize: 16 }}>›</span>
        </div>
      </Link>
    );
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px' }}>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 32px' }}>
        Seller Verification
      </h1>

      {pending.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#D9A02D', color: '#1B2A4A', fontSize: 12, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{pending.length}</span>
            Pending review
          </h2>
          {pending.map((r) => <SellerRow key={r.id} r={r} />)}
        </section>
      )}

      {pending.length === 0 && (
        <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 32, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#2E7D32' }}>
          No pending verification requests.
        </div>
      )}

      {verified.length > 0 && (
        <section>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 14 }}>
            Verified sellers
          </h2>
          {verified.map((r) => <SellerRow key={r.id} r={r} />)}
        </section>
      )}
    </main>
  );
}
