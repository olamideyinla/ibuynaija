import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-auth';
import { pool } from '@/lib/db';
import NameChangeActions from './NameChangeActions';

export const metadata = { title: 'Name Change Requests — Admin | iBuyNaija' };

export default async function AdminNameChangesPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { rows } = await pool.query(
    `SELECT s.id, s.business_name, s.pending_business_name, s.name_change_requested_at,
            u.email AS owner_email
     FROM sellers s
     JOIN users u ON u.id = s.user_id
     WHERE s.pending_business_name IS NOT NULL
     ORDER BY s.name_change_requested_at ASC`,
  );

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px' }}>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 8px' }}>
        Name Change Requests
      </h1>
      <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 28px' }}>
        {rows.length} pending request{rows.length !== 1 ? 's' : ''}
      </p>

      {rows.length === 0 ? (
        <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: 10, padding: '14px 18px', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#2E7D32' }}>
          No pending name change requests.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 14, padding: '18px 24px' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', marginBottom: 4 }}>
                  Current name
                </div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 12 }}>
                  {r.business_name}
                </div>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', marginBottom: 4 }}>
                  Requested name
                </div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#2E7D32' }}>
                  {r.pending_business_name}
                </div>
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', marginBottom: 14 }}>
                {r.owner_email} · Requested {new Date(r.name_change_requested_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <NameChangeActions sellerId={r.id} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
