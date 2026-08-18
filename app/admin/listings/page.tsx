import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin-auth';
import { pool } from '@/lib/db';
import ListingReportActions from './ListingReportActions';

export const metadata = { title: 'Listing Reports — Admin | iBuyNaija' };

export default async function AdminListingsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { rows } = await pool.query(
    `SELECT
       lr.id AS report_id, lr.reason, lr.details, lr.date_created AS reported_at,
       l.id AS listing_id, l.title, l.status AS listing_status,
       s.id AS seller_id, s.business_name
     FROM listing_reports lr
     JOIN listings l ON l.id = lr.listing_id
     JOIN sellers s ON s.id = l.seller_id
     WHERE lr.resolved = false
     ORDER BY lr.date_created ASC`,
  );

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px' }}>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 8px' }}>
        Listing Reports
      </h1>
      <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 28px' }}>
        {rows.length} unresolved report{rows.length !== 1 ? 's' : ''}
      </p>

      {rows.length === 0 ? (
        <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: 10, padding: '14px 18px', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#2E7D32' }}>
          No unresolved listing reports.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rows.map((r) => (
            <div key={r.report_id} style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 14, padding: '18px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                <div>
                  <a href={`/listing/${r.listing_id}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', textDecoration: 'none' }}>
                    {r.title}
                  </a>
                  <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', marginLeft: 10 }}>
                    by{' '}
                    <Link href={`/admin/verification/${r.seller_id}`} style={{ color: '#8A7E66' }}>
                      {r.business_name}
                    </Link>
                  </span>
                  <Link href={`/admin/listings/${r.listing_id}`} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#C1542C', marginLeft: 12, textDecoration: 'none', fontWeight: 600 }}>
                    Edit category →
                  </Link>
                </div>
                <span style={{ background: 'rgba(193,84,44,0.1)', color: '#C1542C', fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                  {r.reason.replace(/_/g, ' ')}
                </span>
              </div>
              {r.details && (
                <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 14px', lineHeight: 1.5 }}>
                  &ldquo;{r.details}&rdquo;
                </p>
              )}
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', marginBottom: 14 }}>
                Reported {new Date(r.reported_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })} · Listing status: <strong>{r.listing_status}</strong>
              </div>
              <ListingReportActions reportId={r.report_id} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
