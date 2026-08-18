import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin-auth';
import { pool } from '@/lib/db';
import ApplicationActions from './ApplicationActions';

interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Application ${id.slice(0, 8)} — Admin | iBuyNaija` };
}

export default async function AdminApplicationDetailPage({ params }: PageProps) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { id } = await params;

  const { rows } = await pool.query(
    `SELECT
       sa.id, sa.business_name, sa.slug, sa.state, sa.city_area, sa.provider_type,
       sa.bank_account_name, sa.bank_account_number, sa.bank_name,
       sa.cac_certificate_url,
       sa.status, sa.rejection_reason, sa.date_applied,
       u.id AS user_id, u.email AS owner_email, u.phone AS owner_phone,
       u.full_name AS owner_name, u.date_joined
     FROM seller_applications sa
     JOIN users u ON u.id = sa.user_id
     WHERE sa.id = $1`,
    [id],
  );

  if (rows.length === 0) notFound();
  const app = rows[0];

  const STATUS_COLOR: Record<string, string> = {
    pending:  '#9B6F00',
    approved: '#2E7D32',
    rejected: '#8A7E66',
  };
  const STATUS_BG: Record<string, string> = {
    pending:  'rgba(217,160,45,0.15)',
    approved: 'rgba(46,125,50,0.1)',
    rejected: 'rgba(27,42,74,0.06)',
  };

  function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14 }}>
        <span style={{ color: '#8A7E66', minWidth: 140, flexShrink: 0 }}>{label}</span>
        <span style={{ color: '#1B2A4A', fontWeight: 600 }}>{value || '—'}</span>
      </div>
    );
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
      <Link href="/admin/seller-applications" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
        ← Seller Applications
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 4px' }}>
            {app.business_name}
          </h1>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66' }}>
            {app.city_area}, {app.state}
            {' · '}Applied {new Date(app.date_applied).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <span style={{
          fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, fontWeight: 700,
          color: STATUS_COLOR[app.status] ?? '#8A7E66',
          background: STATUS_BG[app.status] ?? 'rgba(27,42,74,0.06)',
          padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          {app.status}
        </span>
      </div>

      {/* Applicant */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '18px 24px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          Applicant
        </div>
        <InfoRow label="Full name"    value={app.owner_name} />
        <InfoRow label="Email"        value={app.owner_email} />
        <InfoRow label="Phone"        value={app.owner_phone} />
        <InfoRow label="Member since" value={new Date(app.date_joined).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })} />
      </div>

      {/* Business details */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '18px 24px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          Business Details
        </div>
        <InfoRow label="Business name" value={app.business_name} />
        <InfoRow label="Shop URL slug" value={`ibuynaija.com/shop/${app.slug}`} />
        <InfoRow label="State"         value={app.state} />
        <InfoRow label="City / Area"   value={app.city_area} />
        <InfoRow label="Account type"  value={app.provider_type === 'seller' ? 'Product seller' : app.provider_type === 'provider' ? 'Service provider' : 'Products + Services'} />
      </div>

      {/* Bank details */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '18px 24px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          Bank Details
        </div>
        <InfoRow label="Account name"   value={app.bank_account_name} />
        <InfoRow label="Account number" value={app.bank_account_number} />
        <InfoRow label="Bank"           value={app.bank_name} />
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(217,160,45,0.08)', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#9B6F00' }}>
          Verify that the account name matches the business name before approving.
        </div>
      </div>

      {/* CAC certificate */}
      {app.cac_certificate_url && (
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '18px 24px', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            CAC Certificate / Business Registration
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={app.cac_certificate_url}
            alt="CAC certificate"
            style={{ maxWidth: '100%', maxHeight: 480, objectFit: 'contain', borderRadius: 8, border: '1px solid rgba(27,42,74,0.1)', display: 'block', marginBottom: 10 }}
          />
          <a
            href={app.cac_certificate_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A', fontWeight: 600, textDecoration: 'underline' }}
          >
            Open full size ↗
          </a>
        </div>
      )}

      {app.status === 'rejected' && app.rejection_reason && (
        <div style={{ background: 'rgba(193,84,44,0.06)', border: '1px solid rgba(193,84,44,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: '#C1542C', marginBottom: 4 }}>
            Rejection reason given
          </div>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#C1542C' }}>
            {app.rejection_reason}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <ApplicationActions applicationId={app.id} status={app.status} currentSlug={app.slug} />
    </main>
  );
}
