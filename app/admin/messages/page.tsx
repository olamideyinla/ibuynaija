import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin-auth';
import { pool } from '@/lib/db';

export const metadata = { title: 'Messages — Admin | iBuyNaija' };

export default async function AdminMessagesPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { rows } = await pool.query(
    `SELECT
       mt.id,
       mt.context_type,
       mt.context_id,
       mt.date_created,
       s.business_name,
       (SELECT COUNT(*) FROM messages m WHERE m.thread_id = mt.id) AS message_count,
       (SELECT m2.date_sent FROM messages m2 WHERE m2.thread_id = mt.id ORDER BY m2.date_sent DESC LIMIT 1) AS last_message_at
     FROM message_threads mt
     JOIN sellers s ON s.id = mt.seller_id
     ORDER BY last_message_at DESC NULLS LAST, mt.date_created DESC`,
  );

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px' }}>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 8px' }}>
        Messages
      </h1>
      <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 28px' }}>
        {rows.length} thread{rows.length !== 1 ? 's' : ''} — full access for dispute review
      </p>

      {rows.length === 0 ? (
        <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: 10, padding: '14px 18px', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#2E7D32' }}>
          No message threads yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((r) => (
            <Link key={r.id} href={`/admin/messages/${r.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 12, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: '#1B2A4A' }}>
                      {r.business_name}
                    </span>
                    <span style={{ background: 'rgba(27,42,74,0.08)', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {r.context_type}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>
                    Context ID: {(r.context_id as string).slice(0, 8).toUpperCase()}
                    {' · '}
                    {parseInt(r.message_count)} message{parseInt(r.message_count) !== 1 ? 's' : ''}
                    {r.last_message_at && (
                      <> · Last: {new Date(r.last_message_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                    )}
                  </div>
                </div>
                <span style={{ color: '#8A7E66', fontSize: 18 }}>›</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
