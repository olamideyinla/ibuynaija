import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';
import DeleteServiceButton from './DeleteServiceButton';

export const metadata = { title: 'My Services — Dashboard | iBuyNaija' };

export default async function ProviderServicesPage() {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { rows } = await pool.query(
    `SELECT
       so.id, so.name, so.description, so.price_type,
       so.price, so.price_from, so.duration_minutes,
       so.location_type, so.status, so.date_created,
       c.name AS category_name,
       (SELECT COUNT(*) FROM bookings b WHERE b.service_id = so.id AND b.status = 'requested') AS pending_count,
       (SELECT COUNT(*) FROM availability_schedules av WHERE av.service_id = so.id) AS schedule_days
     FROM service_offerings so
     JOIN categories c ON c.id = so.category_id
     WHERE so.provider_id = $1
     ORDER BY so.date_created DESC`,
    [sellerId],
  );

  const services = rows.map((r) => ({
    id:               r.id,
    name:             r.name,
    price_type:       r.price_type as string,
    price:            r.price != null ? parseFloat(r.price) : null,
    price_from:       r.price_from != null ? parseFloat(r.price_from) : null,
    duration_minutes: r.duration_minutes as number | null,
    location_type:    r.location_type as string,
    status:           r.status as string,
    category_name:    r.category_name as string,
    pending_count:    parseInt(r.pending_count, 10),
    schedule_days:    parseInt(r.schedule_days, 10),
  }));

  function formatDuration(mins: number | null) {
    if (!mins) return '';
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: '#1B2A4A', margin: 0 }}>
            My Services
          </h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link
              href="/dashboard/bookings"
              style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', textDecoration: 'none' }}
            >
              View bookings →
            </Link>
            <Link
                href="/dashboard/services/new"
                style={{
                  background: '#1B2A4A', color: '#F7F1E3',
                  fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
                  padding: '10px 20px', borderRadius: 9, textDecoration: 'none',
                }}
              >
                + New Service
              </Link>
          </div>
        </div>

        {services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✂️</div>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 16, color: '#8A7E66', marginBottom: 20 }}>
              No services listed yet.
            </p>
            <Link
                href="/dashboard/services/new"
                style={{
                  display: 'inline-block', background: '#1B2A4A', color: '#F7F1E3',
                  fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
                  padding: '12px 28px', borderRadius: 10, textDecoration: 'none',
                }}
              >
                Create your first service
              </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {services.map((svc) => (
              <div
                key={svc.id}
                style={{
                  background: '#fff', border: '1px solid rgba(27,42,74,0.08)',
                  borderRadius: 12, padding: '18px 22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A' }}>
                        {svc.name}
                      </span>
                      <span style={{
                        background: svc.status === 'active' ? 'rgba(46,125,50,0.12)' : 'rgba(138,126,102,0.12)',
                        color: svc.status === 'active' ? '#2E7D32' : '#8A7E66',
                        fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>
                        {svc.status}
                      </span>
                      {svc.pending_count > 0 && (
                        <span style={{ background: '#D9A02D', color: '#1B2A4A', fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                          {svc.pending_count} pending
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
                      {svc.category_name}
                      {svc.duration_minutes ? ` · ⏱ ${formatDuration(svc.duration_minutes)}` : ''}
                      {' · '}
                      {svc.schedule_days > 0 ? `${svc.schedule_days} day${svc.schedule_days !== 1 ? 's' : ''}/week` : 'No schedule set'}
                      {' · '}
                      {svc.location_type === 'provider_travels' ? 'Travels to customer' : 'At my location'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 8 }}>
                      {svc.price_type === 'fixed' && svc.price != null
                        ? formatNaira(svc.price)
                        : svc.price_from != null
                        ? `From ${formatNaira(svc.price_from)}`
                        : 'Quote'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Link
                        href={`/dashboard/services/${svc.id}/edit`}
                        style={{
                          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600,
                          color: '#1B2A4A', background: 'none', border: '1px solid rgba(27,42,74,0.2)',
                          borderRadius: 7, padding: '5px 12px', textDecoration: 'none',
                        }}
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/services/${svc.id}`}
                        style={{
                          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600,
                          color: '#8A7E66', background: 'none', border: '1px solid rgba(27,42,74,0.12)',
                          borderRadius: 7, padding: '5px 12px', textDecoration: 'none',
                        }}
                      >
                        View
                      </Link>
                      <DeleteServiceButton serviceId={svc.id} name={svc.name} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
