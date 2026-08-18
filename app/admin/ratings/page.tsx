import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin-auth';
import { pool } from '@/lib/db';
import RatingReportActions from './RatingReportActions';

export const metadata = { title: 'Rating Reports — Admin | iBuyNaija' };

export default async function AdminRatingsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { rows } = await pool.query(
    `SELECT
       rr.id AS report_id, rr.reason, rr.date_created AS reported_at,
       r.id AS rating_id, r.score, r.comment, r.reported AS rating_flagged,
       l.id AS listing_id, l.title AS listing_title,
       s.id AS seller_id, s.business_name
     FROM rating_reports rr
     JOIN ratings r ON r.id = rr.rating_id
     JOIN listings l ON l.id = r.listing_id
     JOIN sellers s ON s.id = l.seller_id
     WHERE rr.resolved = false
     ORDER BY rr.date_created ASC`,
  );

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px' }}>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 8px' }}>
        Rating Reports
      </h1>
      <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 28px' }}>
        {rows.length} unresolved report{rows.length !== 1 ? 's' : ''}
      </p>

      {rows.length === 0 ? (
        <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: 10, padding: '14px 18px', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#2E7D32' }}>
          No unresolved rating reports.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rows.map((r) => (
            <div key={r.report_id} style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 14, padding: '18px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                <div>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A' }}>
                    UX: {r.buying_experience_score}/5 · Quality: {r.product_quality_score}/5
                  </span>
                  <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', marginLeft: 10 }}>
                    on{' '}
                    <a href={`/listing/${r.listing_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1B2A4A' }}>
                      {r.listing_title}
                    </a>
                    {' '}by{' '}
                    <Link href={`/admin/verification/${r.seller_id}`} style={{ color: '#8A7E66' }}>
                      {r.business_name}
                    </Link>
                  </span>
                </div>
                <span style={{ background: 'rgba(193,84,44,0.1)', color: '#C1542C', fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                  {r.reason}
                </span>
              </div>
              {r.comment && (
                <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 12px', lineHeight: 1.5 }}>
                  &ldquo;{r.comment}&rdquo;
                </p>
              )}
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', marginBottom: 14 }}>
                Reported {new Date(r.reported_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                {r.rating_flagged && <span style={{ marginLeft: 10, color: '#C1542C' }}>· Already flagged</span>}
              </div>
              <RatingReportActions reportId={r.report_id} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
