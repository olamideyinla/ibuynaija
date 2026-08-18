import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BookingStatusBadge from '@/components/booking/BookingStatusBadge';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';
import type { BookingStatus } from '@/types';
import ProviderBookingActions from './ProviderBookingActions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Booking #${id.slice(0, 8).toUpperCase()} — Dashboard | iBuyNaija` };
}

export default async function ProviderBookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const store = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { rows } = await pool.query(
    `SELECT
       b.id, b.provider_id, b.buyer_id, b.service_id,
       b.requested_datetime, b.status, b.quote_requested,
       b.confirmed_price, b.provider_note, b.notes, b.address,
       b.date_created, b.date_updated,
       so.name          AS service_name,
       so.price_type,
       so.price         AS service_price,
       so.duration_minutes,
       so.location_type,
       u.phone          AS buyer_phone,
       u.email          AS buyer_email
     FROM bookings b
     JOIN service_offerings so ON so.id = b.service_id
     JOIN users             u  ON u.id  = b.buyer_id
     WHERE b.id = $1`,
    [id],
  );

  if (rows.length === 0) notFound();
  const r = rows[0];
  if (r.provider_id !== sellerId) redirect('/dashboard/bookings');

  const status         = r.status as BookingStatus;
  const confirmedPrice = r.confirmed_price != null ? parseFloat(r.confirmed_price) : null;
  const servicePrice   = r.service_price != null ? parseFloat(r.service_price) : null;
  const shortId = id.slice(0, 8).toUpperCase();

  // Mask buyer phone
  const rawPhone   = r.buyer_phone as string;
  const maskedPhone = rawPhone
    ? rawPhone.slice(0, 7) + '****' + rawPhone.slice(-2)
    : '—';

  function formatDt(dt: string) {
    return new Date(dt).toLocaleString('en-NG', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        {/* Back link */}
        <Link href="/dashboard/bookings" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
          ← All bookings
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: 0 }}>
              Booking #{shortId}
            </h1>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '6px 0 0' }}>
              {new Date(r.date_created).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {r.quote_requested && (
              <span style={{ background: 'rgba(27,42,74,0.08)', color: '#8A7E66', fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, letterSpacing: 0.3 }}>
                QUOTE
              </span>
            )}
            <BookingStatusBadge status={status} />
          </div>
        </div>

        {/* Service + appointment details */}
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Service</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: '#1B2A4A', marginBottom: 14 }}>{r.service_name}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
            <div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginBottom: 3 }}>
                {r.quote_requested ? 'Preferred date' : 'Requested slot'}
              </div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: '#1B2A4A' }}>
                {formatDt(r.requested_datetime)}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginBottom: 3 }}>Price</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A' }}>
                {confirmedPrice != null
                  ? formatNaira(confirmedPrice)
                  : servicePrice != null
                  ? formatNaira(servicePrice)
                  : 'To be quoted'}
              </div>
            </div>
            {r.location_type !== 'at_provider' && r.address && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginBottom: 3 }}>Client address</div>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A' }}>{r.address}</div>
              </div>
            )}
          </div>
        </div>

        {/* Buyer contact */}
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '16px 24px', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Client contact</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
            <div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginBottom: 2 }}>Phone</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15, color: '#1B2A4A' }}>{maskedPhone}</div>
            </div>
            {r.buyer_email && (
              <div>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginBottom: 2 }}>Email</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15, color: '#1B2A4A' }}>{r.buyer_email}</div>
              </div>
            )}
          </div>
        </div>

        {/* Client notes / job description */}
        {r.notes && (
          <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {r.quote_requested ? 'Job description' : 'Client notes'}
            </div>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', margin: 0, lineHeight: 1.6 }}>{r.notes}</p>
          </div>
        )}

        {/* Provider actions (client component) */}
        <ProviderBookingActions
          bookingId={id}
          currentStatus={status}
          isQuote={r.quote_requested}
          onStatusChange={() => {}}
        />
      </main>
    </>
  );
}
