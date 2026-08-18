import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { formatNaira } from '@/lib/format';
import JsonLd from '@/components/JsonLd';
import { buildServiceJsonLd } from '@/lib/structured-data';
import type { Metadata } from 'next';
import BookingForm from './BookingForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Reuse the same slot computation from the API route
function computeAvailableSlots(
  schedules: { day_of_week: number; start_time: string; end_time: string }[],
  blockedDates: Set<string>,
  count = 14,
): { date: string; day_label: string; start_time: string; end_time: string }[] {
  const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const scheduleMap = new Map(schedules.map((s) => [s.day_of_week, s]));
  const slots: { date: string; day_label: string; start_time: string; end_time: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() + 1);
  for (let i = 0; i < 90 && slots.length < count; i++) {
    const dow = cursor.getDay();
    const sched = scheduleMap.get(dow);
    if (sched) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (!blockedDates.has(dateStr)) {
        slots.push({ date: dateStr, day_label: DAY_LABELS[dow], start_time: sched.start_time, end_time: sched.end_time });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return slots;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { rows } = await pool.query(
    `SELECT so.name, so.description, s.business_name
     FROM service_offerings so JOIN sellers s ON s.id = so.provider_id
     WHERE so.id = $1`,
    [id],
  );
  if (!rows[0]) return { title: 'Service not found | iBuyNaija' };
  const r = rows[0];
  return {
    title: `${r.name} — ${r.business_name} | iBuyNaija`,
    description: r.description.slice(0, 160),
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [svcResult, schedResult, blockResult] = await Promise.all([
    pool.query(
      `SELECT
         so.id, so.name, so.description, so.price_type,
         so.price, so.price_from, so.duration_minutes,
         so.location_type, so.photos, so.status,
         c.name AS category_name, c.slug AS category_slug,
         s.id    AS provider_id,
         s.slug  AS provider_slug,
         s.business_name,
         s.tagline,
         s.description AS provider_description,
         s.state, s.city_area,
         s.verified_status,
         s.logo_photo_url,
         s.date_created AS provider_since
       FROM service_offerings so
       JOIN sellers    s ON s.id = so.provider_id
       JOIN categories c ON c.id = so.category_id
       WHERE so.id = $1`,
      [id],
    ),
    pool.query(
      `SELECT day_of_week, start_time::text, end_time::text
       FROM availability_schedules WHERE service_id = $1 ORDER BY day_of_week`,
      [id],
    ),
    pool.query(
      `SELECT blocked_date::text AS blocked_date
       FROM availability_blocks
       WHERE service_id = $1 AND blocked_date >= CURRENT_DATE`,
      [id],
    ),
  ]);

  if (svcResult.rows.length === 0) notFound();

  const r = svcResult.rows[0];
  if (r.status !== 'active') notFound();

  const price      = r.price != null ? parseFloat(r.price) : null;
  const priceFrom  = r.price_from != null ? parseFloat(r.price_from) : null;
  const isFixed    = r.price_type === 'fixed';
  const blockedSet = new Set<string>(blockResult.rows.map((b) => b.blocked_date));
  const availableSlots = computeAvailableSlots(schedResult.rows, blockedSet);

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const providerYr = new Date(r.provider_since).getFullYear();
  const providerInitials = r.business_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  function formatDuration(mins: number | null) {
    if (!mins) return '';
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  return (
    <>
      <JsonLd
        data={buildServiceJsonLd({
          id: r.id,
          name: r.name,
          description: r.description,
          price_type: r.price_type,
          price,
          price_from: priceFrom,
          category_name: r.category_name,
          provider_slug: r.provider_slug,
          business_name: r.business_name,
          state: r.state,
          city_area: r.city_area,
        })}
      />
      <Navbar />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
          <Link href="/services" style={{ color: '#8A7E66', textDecoration: 'none' }}>Services</Link>
          <span>›</span>
          <Link href={`/services?category=${r.category_slug}`} style={{ color: '#8A7E66', textDecoration: 'none' }}>{r.category_name}</Link>
          <span>›</span>
          <span style={{ color: '#1B2A4A', fontWeight: 600 }}>{r.name.slice(0, 40)}{r.name.length > 40 ? '…' : ''}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 40, alignItems: 'start' }}>
          {/* Left column */}
          <div>
            {/* Photo */}
            <div style={{ borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg,#2C426B,#1B2A4A)', aspectRatio: '16/9', marginBottom: 24, position: 'relative' }}>
              {r.photos?.[0] ? (
                <img src={r.photos[0]} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, opacity: 0.3 }}>✂️</div>
              )}
            </div>

            {/* Category + title */}
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#2C426B', marginBottom: 8 }}>{r.category_name}</div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: '#1B2A4A', margin: '0 0 20px', lineHeight: 1.2 }}>{r.name}</h1>

            {/* Price + meta row */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', padding: '16px 0', borderTop: '1px solid rgba(27,42,74,0.1)', borderBottom: '1px solid rgba(27,42,74,0.1)', marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Price</div>
                {isFixed && price != null ? (
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: '#1B2A4A' }}>{formatNaira(price)}</div>
                ) : priceFrom != null ? (
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: '#1B2A4A' }}>From {formatNaira(priceFrom)}</div>
                ) : (
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 16, color: '#8A7E66', fontStyle: 'italic' }}>Quote on request</div>
                )}
              </div>
              {r.duration_minutes && (
                <div style={{ borderLeft: '1px solid rgba(27,42,74,0.1)', paddingLeft: 20 }}>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Duration</div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A' }}>⏱ {formatDuration(r.duration_minutes)}</div>
                </div>
              )}
              <div style={{ borderLeft: '1px solid rgba(27,42,74,0.1)', paddingLeft: 20 }}>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Location</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: '#1B2A4A' }}>
                  {r.location_type === 'provider_travels' ? '🚗 Provider travels to you' : '📍 At provider\'s location'}
                </div>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', marginTop: 2 }}>{r.city_area}, {r.state}</div>
                {r.location_type === 'provider_travels' && (
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#C1542C', marginTop: 4, lineHeight: 1.4 }}>
                    Transport cost is not included — the customer covers travel expenses.
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>About this service</div>
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: '#1B2A4A', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{r.description}</p>
            </div>

            {/* Weekly availability */}
            {schedResult.rows.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Weekly schedule</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {schedResult.rows.map((s: { day_of_week: number; start_time: string; end_time: string }) => (
                    <div key={s.day_of_week} style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: '#1B2A4A' }}>{DAY_NAMES[s.day_of_week]}</div>
                      <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginTop: 2 }}>{s.start_time} – {s.end_time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Provider card */}
            <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Provider</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#2C426B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: '#F7F1E3', flexShrink: 0 }}>
                  {providerInitials}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A' }}>{r.business_name}</span>
                    {r.verified_status && (
                      <span style={{ background: '#1B2A4A', color: '#D9A02D', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: 0.3 }}>✓ VERIFIED</span>
                    )}
                  </div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>Member since {providerYr} · {r.city_area}, {r.state}</div>
                  {r.tagline && <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', marginTop: 4, fontStyle: 'italic' }}>{r.tagline}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Right column — booking form */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 16, padding: 24 }}>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: '#1B2A4A', margin: '0 0 6px' }}>
                {isFixed ? 'Request a Booking' : 'Request a Quote'}
              </h2>
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 20px', lineHeight: 1.5 }}>
                {isFixed
                  ? 'Pick a slot — the provider will confirm your request.'
                  : 'Describe your job and the provider will respond with availability and pricing.'}
              </p>
              <BookingForm
                serviceId={r.id}
                priceType={r.price_type}
                price={price}
                priceFrom={priceFrom}
                locationRequired={r.location_type === 'provider_travels'}
                availableSlots={availableSlots}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
