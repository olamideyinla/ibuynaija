import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BookingStatusBadge from '@/components/booking/BookingStatusBadge';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import type { BookingStatus } from '@/types';

export const metadata = { title: 'Bookings — Dashboard | iBuyNaija' };

// Sort order for statuses: action-required first
const STATUS_ORDER: Record<string, number> = {
  requested: 0,
  confirmed: 1,
  completed: 2,
  no_show: 3,
  cancelled: 4,
};

export default async function ProviderBookingsPage() {
  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { rows } = await pool.query(
    `SELECT
       b.id, b.requested_datetime, b.status, b.quote_requested,
       b.confirmed_price, b.notes, b.date_created,
       so.name AS service_name,
       so.price_type,
       so.price AS service_price
     FROM bookings b
     JOIN service_offerings so ON so.id = b.service_id
     WHERE b.provider_id = $1
     ORDER BY
       CASE b.status
         WHEN 'requested'  THEN 0
         WHEN 'confirmed'  THEN 1
         WHEN 'completed'  THEN 2
         WHEN 'no_show'    THEN 3
         WHEN 'cancelled'  THEN 4
         ELSE 5
       END,
       b.requested_datetime ASC`,
    [sellerId],
  );

  const bookings = rows.map((r) => ({
    id:                 r.id,
    requested_datetime: r.requested_datetime as string,
    status:             r.status as BookingStatus,
    quote_requested:    r.quote_requested as boolean,
    confirmed_price:    r.confirmed_price != null ? parseFloat(r.confirmed_price) : null,
    notes:              r.notes as string | null,
    date_created:       r.date_created as string,
    service_name:       r.service_name as string,
    price_type:         r.price_type as string,
    service_price:      r.service_price != null ? parseFloat(r.service_price) : null,
  }));

  const pending   = bookings.filter((b) => b.status === 'requested');
  const upcoming  = bookings.filter((b) => b.status === 'confirmed');
  const past      = bookings.filter((b) => ['completed', 'no_show', 'cancelled'].includes(b.status));

  function formatDt(dt: string) {
    return new Date(dt).toLocaleString('en-NG', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function BookingRow({ b }: { b: typeof bookings[0] }) {
    return (
      <Link href={`/dashboard/bookings/${b.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(27,42,74,0.08)',
            borderRadius: 12,
            padding: '16px 20px',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A' }}>
                {b.service_name}
              </span>
              {b.quote_requested && (
                <span style={{ background: 'rgba(27,42,74,0.08)', color: '#8A7E66', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4 }}>
                  QUOTE
                </span>
              )}
            </div>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
              #{b.id.slice(0, 8).toUpperCase()} · {formatDt(b.requested_datetime)}
            </div>
            {b.notes && (
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                &ldquo;{b.notes}&rdquo;
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <BookingStatusBadge status={b.status} />
            <span style={{ color: '#8A7E66', fontSize: 16 }}>›</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: '#1B2A4A', margin: 0 }}>
            Bookings
          </h1>
          <Link
            href="/dashboard/services"
            style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', textDecoration: 'none' }}
          >
            Manage services →
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 16, color: '#8A7E66' }}>
              No booking requests yet.
            </p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ background: '#D9A02D', color: '#1B2A4A', fontSize: 12, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{pending.length}</span>
                  Pending action
                </h2>
                {pending.map((b) => <BookingRow key={b.id} b={b} />)}
              </section>
            )}
            {upcoming.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 14 }}>Confirmed upcoming</h2>
                {upcoming.map((b) => <BookingRow key={b.id} b={b} />)}
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 14 }}>Past</h2>
                {past.map((b) => <BookingRow key={b.id} b={b} />)}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
