import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { BUYER_COOKIE } from '@/lib/cookie';
import MessageComposer from '@/components/messages/MessageComposer';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { orderId } = await params;
  return { title: `Message Seller — Order #${orderId.slice(0, 8).toUpperCase()} | iBuyNaija` };
}

export default async function BuyerOrderMessagesPage({ params }: PageProps) {
  const { orderId } = await params;
  const store   = await cookies();
  const buyerId = store.get(BUYER_COOKIE)?.value ?? null;
  if (!buyerId) redirect('/login');

  // Verify buyer owns this order and get seller info
  const { rows: orderRows } = await pool.query(
    `SELECT o.buyer_id, s.business_name
     FROM orders o
     JOIN sellers s ON s.id = o.seller_id
     WHERE o.id = $1`,
    [orderId],
  );
  if (orderRows.length === 0) notFound();
  if (orderRows[0].buyer_id !== buyerId) redirect('/');

  const businessName = orderRows[0].business_name as string;
  const shortId      = orderId.slice(0, 8).toUpperCase();

  // Fetch existing thread + messages (empty if thread not yet created)
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
            href={`/orders/${orderId}`}
            style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none' }}
          >
            ← Order #{shortId}
          </Link>
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A', margin: '0 0 4px' }}>
          Message {businessName}
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
              const isMine = m.sender_type === 'buyer';
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
                      {isMine ? 'You' : businessName}
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
          senderLabel="You (buyer)"
        />
      </main>
    </>
  );
}
