import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin-auth';
import { pool } from '@/lib/db';

export const metadata = { title: 'Seller Applications — Admin | iBuyNaija' };

export default async function AdminSellerApplicationsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { rows } = await pool.query(
    `SELECT
       sa.id, sa.business_name, sa.state, sa.city_area, sa.provider_type,
       sa.status, sa.date_applied,
       u.email AS owner_email, u.full_name AS owner_name
     FROM seller_applications sa
     JOIN users u ON u.id = sa.user_id
     ORDER BY
       CASE sa.status
         WHEN 'pending'  THEN 0
         WHEN 'rejected' THEN 1
         ELSE 2
       END,
       sa.date_applied DESC`,
  );

  const pending  = rows.filter(r => r.status === 'pending');
  const others   = rows.filter(r => r.status !== 'pending');

  const STATUS_COLOR: Record<string, string> = {
    pending:  '#9B6F00',
    approved: '#2E7D32',
    rejected: '#8A7E66',
  };
  const STATUS_BG: Record<string, string> = {
    pending:  'rgba(217,160,45,0.12)',
    approved: 'rgba(46,125,50,0.1)',
    rejected: 'rgba(27,42,74,0.06)',
  };

  function ApplicationRow({ r }: { r: typeof rows[0] }) {
    return (
      <Link href={`/admin/seller-applications/${r.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 3 }}>
              {r.business_name}
            </div>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
              {r.city_area}, {r.state}
              {' · '}{r.owner_name ? `${r.owner_name} · ` : ''}{r.owner_email}
              {' · '}Applied {new Date(r.date_applied).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <span style={{
            fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700,
            color: STATUS_COLOR[r.status] ?? '#8A7E66',
            background: STATUS_BG[r.status] ?? 'rgba(27,42,74,0.06)',
            padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
          }}>
            {r.status}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px' }}>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 32px' }}>
        Seller Applications
      </h1>

      {pending.length > 0 ? (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#D9A02D', color: '#1B2A4A', fontSize: 12, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
              {pending.length}
            </span>
            Pending review
          </h2>
          {pending.map(r => <ApplicationRow key={r.id} r={r} />)}
        </section>
      ) : (
        <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 32, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#2E7D32' }}>
          No pending applications.
        </div>
      )}

      {others.length > 0 && (
        <section>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 14 }}>
            Past decisions
          </h2>
          {others.map(r => <ApplicationRow key={r.id} r={r} />)}
        </section>
      )}
    </main>
  );
}
