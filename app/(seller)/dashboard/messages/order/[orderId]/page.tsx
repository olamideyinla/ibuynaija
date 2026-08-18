import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import MessageComposer from '@/components/messages/MessageComposer';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { orderId } = await params;
  return { title: `Message Buyer — Order #${orderId.slice(0, 8).toUpperCase()} | iBuyNaija` };
}

export default async function SellerOrderMessagesPage({ params }: PageProps) {
  const { orderId } = await params;
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  // Verify seller owns this order
  const { rows: orderRows } = await pool.query(
    `SELECT o.seller_id, o.buyer_id,
            cs.buyer_phone, cs.buyer_email
     FROM orders o
     JOIN checkout_sessions cs ON cs.id = o.checkout_session_id
     WHERE o.id = $1`,
    [orderId],
  );
  if (orderRows.length === 0) notFound();
  if (orderRows[0].seller_id !== sellerId) redirect('/dashboard');

  const shortId = orderId.slice(0, 8).toUpperCase();

  // Fetch existing thread + messages
  const { rows: messageRows } = await pool.query(
    `SELECT m.id, m.sender_type, m.body, m.date_sent
     FROM message_threads mt
     JOIN messages m ON m.thread_id = mt.id
     WHERE mt.context_type = 'order' AND mt.context_id = $1
     ORDER BY m.date_sent ASC`,
    [orderId],
  );

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: 20 }}>
          <Link
            href={`/dashboard/orders/${orderId}`}
            style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none' }}
          >
            ← Order #{shortId}
          </Link>
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A', margin: '0 0 4px' }}>
          Message Buyer
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 24px' }}>
          Regarding Order #{shortId}
        </p>

        {/* Thread */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, minHeight: 80 }}>
          {messageRows.length === 0 ? (
            <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#8A7E66', textAlign: 'center', padding: '32px 0' }}>
              No messages yet. Start the conversation below.
            </div>
          ) : (
            messageRows.map((m) => {
              const isMine = m.sender_type === 'seller';
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%',
                    background: isMine ? '#1B2A4A' : '#fff',
                    border: isMine ? 'none' : '1px solid rgba(27,42,74,0.1)',
                    borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    padding: '10px 14px',
                  }}>
                    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 600, color: isMine ? 'rgba(247,241,227,0.6)' : '#8A7E66', marginBottom: 4 }}>
                      {isMine ? 'You' : 'Buyer'}
                    </div>
                    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: isMine ? '#F7F1E3' : '#1B2A4A', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {m.body}
                    </div>
                    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: isMine ? 'rgba(247,241,227,0.45)' : '#8A7E66', marginTop: 4, textAlign: isMine ? 'right' : 'left' }}>
                      {new Date(m.date_sent).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <MessageComposer
          contextType="order"
          contextId={orderId}
          senderLabel="You (seller)"
        />
      </main>
    </>
  );
}
