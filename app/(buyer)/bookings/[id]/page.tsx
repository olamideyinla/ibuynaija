import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BookingStatusBadge from '@/components/booking/BookingStatusBadge';
import { pool } from '@/lib/db';
import { BUYER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';
import type { BookingStatus } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Booking #${id.slice(0, 8).toUpperCase()} | iBuyNaija` };
}

export default async function BuyerBookingPage({ params }: PageProps) {
  const { id } = await params;
  const store = await cookies();
  const buyerId = store.get(BUYER_COOKIE)?.value ?? null;

  if (!buyerId) redirect('/login');

  const { rows } = await pool.query(
    `SELECT
       b.id, b.provider_id, b.service_id, b.buyer_id,
       b.requested_datetime, b.status, b.quote_requested,
       b.confirmed_price, b.provider_note, b.notes, b.address,
       b.date_created, b.date_updated,
       so.name          AS service_name,
       so.price_type,
       so.price         AS service_price,
       so.duration_minutes,
       so.location_type,
       s.business_name  AS provider_name,
       s.slug           AS provider_slug,
       s.state          AS provider_state,
       s.city_area      AS provider_city,
       s.verified_status
     FROM bookings b
     JOIN service_offerings so ON so.id = b.service_id
     JOIN sellers           s  ON s.id  = b.provider_id
     WHERE b.id = $1`,
    [id],
  );

  if (rows.length === 0) notFound();

  const r = rows[0];
  if (r.buyer_id !== buyerId) redirect('/');

  const status        = r.status as BookingStatus;
  const confirmedPrice = r.confirmed_price != null ? parseFloat(r.confirmed_price) : null;
  const servicePrice   = r.service_price != null ? parseFloat(r.service_price) : null;
  const shortId = id.slice(0, 8).toUpperCase();

  const STATUS_STEPS: BookingStatus[] = ['requested', 'confirmed', 'completed'];
  const stepIdx = STATUS_STEPS.indexOf(status);

  function formatDatetime(dt: string) {
    return new Date(dt).toLocaleString('en-NG', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: 0 }}>
              Booking #{shortId}
            </h1>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '6px 0 0' }}>
              Submitted {new Date(r.date_created).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <BookingStatusBadge status={status} />
        </div>

        {/* Status stepper (non-cancelled/no_show) */}
        {status !== 'cancelled' && status !== 'no_show' && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, overflowX: 'auto' }}>
            {STATUS_STEPS.map((step, i) => {
              const done   = i <= stepIdx;
              const active = i === stepIdx;
              const labels: Record<string, string> = {
                requested: 'Requested', confirmed: 'Confirmed', completed: 'Completed',
              };
              return (
                <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? '1' : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: done ? '#1B2A4A' : 'rgba(27,42,74,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12,
                      color: done ? '#F7F1E3' : '#8A7E66',
                      border: active ? '2px solid #D9A02D' : 'none',
                    }}>
                      {done && !active ? '✓' : i + 1}
                    </div>
                    <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: done ? '#1B2A4A' : '#8A7E66', whiteSpace: 'nowrap', fontWeight: active ? 700 : 400 }}>
                      {labels[step]}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: i < stepIdx ? '#1B2A4A' : 'rgba(27,42,74,0.12)', margin: '0 4px', marginBottom: 20 }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Terminal status notices */}
        {status === 'cancelled' && (
          <div style={{ background: 'rgba(138,126,102,0.1)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66' }}>
            This booking was declined or cancelled.
            {r.provider_note && <> The provider said: <em>&ldquo;{r.provider_note}&rdquo;</em></>}
          </div>
        )}
        {status === 'no_show' && (
          <div style={{ background: 'rgba(193,84,44,0.08)', border: '1px solid rgba(193,84,44,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#C1542C' }}>
            This booking was marked as a no-show.
          </div>
        )}

        {/* Service details */}
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Service</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: '#1B2A4A', marginBottom: 6 }}>{r.service_name}</div>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', marginBottom: 12 }}>
            {r.provider_name}
            {r.verified_status && <span style={{ color: '#D9A02D', marginLeft: 6 }}>✓ Verified</span>}
            {' · '}{r.provider_city}, {r.provider_state}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
            <div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginBottom: 3 }}>
                {r.quote_requested ? 'Preferred date' : 'Requested slot'}
              </div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: '#1B2A4A' }}>
                {formatDatetime(r.requested_datetime)}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginBottom: 3 }}>Price</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A' }}>
                {confirmedPrice != null
                  ? formatNaira(confirmedPrice)
                  : servicePrice != null
                  ? formatNaira(servicePrice)
                  : r.quote_requested ? 'Awaiting quote' : '—'}
              </div>
            </div>
            {r.address && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginBottom: 3 }}>Address</div>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A' }}>{r.address}</div>
              </div>
            )}
          </div>
        </div>

        {/* Buyer notes */}
        {r.notes && (
          <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Your notes</div>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', margin: 0, lineHeight: 1.6 }}>{r.notes}</p>
          </div>
        )}

        {/* Provider note */}
        {r.provider_note && status !== 'cancelled' && (
          <div style={{ background: 'rgba(27,42,74,0.04)', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Message from provider</div>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>&ldquo;{r.provider_note}&rdquo;</p>
          </div>
        )}

        {/* Pending notice */}
        {status === 'requested' && (
          <div style={{ background: 'rgba(217,160,45,0.08)', border: '1px solid rgba(217,160,45,0.35)', borderRadius: 12, padding: '14px 18px', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', lineHeight: 1.6 }}>
            <strong>Awaiting provider response.</strong> The provider will confirm or decline your request. You&apos;ll be able to see their response here.
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <Link href="/services" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', textDecoration: 'none' }}>
            ← Back to services
          </Link>
        </div>
      </main>
    </>
  );
}
