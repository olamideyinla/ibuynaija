import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin-auth';
import { pool } from '@/lib/db';
import { computeRankBand } from '@/lib/ranking';
import VerificationActions from './VerificationActions';

interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Seller ${id.slice(0, 8)} — Verification | Admin` };
}

export default async function AdminVerificationDetailPage({ params }: PageProps) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { id } = await params;

  const [sellerRes, listingsRes, notesRes, reportsRes] = await Promise.all([
    pool.query(
      `SELECT s.id, s.business_name, s.slug, s.state, s.city_area,
              s.verified_status, s.verification_requested, s.verified_date,
              u.email AS owner_email, u.phone AS owner_phone
       FROM sellers s JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [id],
    ),
    pool.query(
      `SELECT id, title, status, made_in_nigeria, date_posted
       FROM listings WHERE seller_id = $1 ORDER BY date_posted DESC`,
      [id],
    ),
    pool.query(
      `SELECT vn.id, vn.text, vn.date_created, au.email AS admin_email
       FROM verification_notes vn JOIN admin_users au ON au.id = vn.admin_id
       WHERE vn.seller_id = $1 ORDER BY vn.date_created DESC`,
      [id],
    ),
    pool.query(
      `SELECT lr.id AS report_id, lr.reason, lr.details, lr.resolved, lr.date_created,
              l.title AS listing_title
       FROM listing_reports lr JOIN listings l ON l.id = lr.listing_id
       WHERE l.seller_id = $1 ORDER BY lr.date_created DESC`,
      [id],
    ),
  ]);

  if (sellerRes.rows.length === 0) notFound();
  const seller = sellerRes.rows[0];

  // Example rank band: unverified vs verified, sameState=Oyo
  const exampleContext = { buyer_state: seller.state, buyer_city: seller.city_area };
  const rank_band = computeRankBand(
    { verified_status: seller.verified_status, state: seller.state, city_area: seller.city_area },
    exampleContext,
  );

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
      <Link href="/admin/verification" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
        ← Verification queue
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 4px' }}>
            {seller.business_name}
          </h1>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66' }}>
            {seller.city_area}, {seller.state} · <a href={`/seller/${seller.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1B2A4A' }}>View public profile</a>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {seller.verified_status && (
            <span style={{ background: 'rgba(46,125,50,0.12)', color: '#2E7D32', fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6 }}>
              VERIFIED
            </span>
          )}
          {seller.verification_requested && !seller.verified_status && (
            <span style={{ background: 'rgba(217,160,45,0.15)', color: '#9B6F00', fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6 }}>
              PENDING REVIEW
            </span>
          )}
          <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
            Rank band: <strong style={{ color: '#1B2A4A' }}>{rank_band}</strong>/6 (same city)
          </span>
        </div>
      </div>

      {/* Contact */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '16px 24px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Owner contact</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A' }}>
          <div><span style={{ color: '#8A7E66' }}>Email: </span>{seller.owner_email}</div>
          <div><span style={{ color: '#8A7E66' }}>Phone: </span>{seller.owner_phone ?? '—'}</div>
        </div>
      </div>

      {/* Listings */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '16px 24px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Listings ({listingsRes.rows.length})
        </div>
        {listingsRes.rows.length === 0 ? (
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: 0 }}>No listings yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {listingsRes.rows.map((l) => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <a href={`/listing/${l.id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1B2A4A', textDecoration: 'none' }}>{l.title}</a>
                  <Link href={`/admin/listings/${l.id}`} style={{ fontSize: 12, color: '#C1542C', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Edit category →
                  </Link>
                </div>
                <span style={{ color: l.status === 'active' ? '#2E7D32' : '#8A7E66', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
                  {l.status}{!l.made_in_nigeria ? ' ⚠ NOT MiN' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reports */}
      {reportsRes.rows.length > 0 && (
        <div style={{ background: 'rgba(193,84,44,0.05)', border: '1px solid rgba(193,84,44,0.2)', borderRadius: 14, padding: '16px 24px', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#C1542C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Listing reports ({reportsRes.rows.filter((r) => !r.resolved).length} unresolved)
          </div>
          {reportsRes.rows.map((r) => (
            <div key={r.report_id} style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A', marginBottom: 6 }}>
              <strong>{r.reason}</strong> on &ldquo;{r.listing_title}&rdquo;
              {r.details && <span style={{ color: '#8A7E66' }}> — {r.details}</span>}
              {r.resolved && <span style={{ color: '#2E7D32', marginLeft: 8 }}>✓ resolved</span>}
            </div>
          ))}
        </div>
      )}

      {/* Actions (client component) */}
      <VerificationActions
        sellerId={id}
        currentStatus={{ verified: seller.verified_status, requested: seller.verification_requested }}
        existingNotes={notesRes.rows}
      />
    </main>
  );
}
