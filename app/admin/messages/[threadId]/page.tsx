import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin-auth';
import { pool } from '@/lib/db';

interface PageProps {
  params: Promise<{ threadId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { threadId } = await params;
  return { title: `Thread ${threadId.slice(0, 8).toUpperCase()} — Admin | iBuyNaija` };
}

export default async function AdminThreadPage({ params }: PageProps) {
  const { threadId } = await params;

  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { rows: [thread] } = await pool.query(
    `SELECT mt.id, mt.context_type, mt.context_id, mt.date_created,
            s.business_name, s.id AS seller_id
     FROM message_threads mt
     JOIN sellers s ON s.id = mt.seller_id
     WHERE mt.id = $1`,
    [threadId],
  );
  if (!thread) notFound();

  const { rows: messages } = await pool.query(
    `SELECT id, sender_type, body, date_sent
     FROM messages
     WHERE thread_id = $1
     ORDER BY date_sent ASC`,
    [threadId],
  );

  const shortContext = (thread.context_id as string).slice(0, 8).toUpperCase();

  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '36px 24px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/messages" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none' }}>
          ← All threads
        </Link>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A', margin: '0 0 4px' }}>
          Thread — {thread.business_name}
        </h1>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>
          Context: <strong style={{ textTransform: 'capitalize' }}>{thread.context_type}</strong> #{shortContext}
          {' · '}
          Started {new Date(thread.date_created).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Contextual link */}
      <div style={{ marginBottom: 20 }}>
        {thread.context_type === 'order' && (
          <a
            href={`/dashboard/orders/${thread.context_id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A' }}
          >
            View order #{shortContext} ↗
          </a>
        )}
      </div>

      {/* Admin notice */}
      <div style={{ background: 'rgba(217,160,45,0.1)', border: '1px solid rgba(217,160,45,0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 24, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#9B6F00' }}>
        Admin view — read-only. Full thread shown for dispute review.
      </div>

      {/* Messages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 ? (
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', textAlign: 'center', padding: '32px 0' }}>
            No messages in this thread.
          </div>
        ) : (
          messages.map((m) => {
            const isSeller = m.sender_type === 'seller';
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isSeller ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%',
                  background: isSeller ? 'rgba(27,42,74,0.08)' : '#fff',
                  border: '1px solid rgba(27,42,74,0.1)',
                  borderRadius: 12,
                  padding: '10px 14px',
                }}>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', marginBottom: 4, textTransform: 'capitalize' }}>
                    {m.sender_type}
                  </div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {m.body}
                  </div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginTop: 4 }}>
                    {new Date(m.date_sent).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
