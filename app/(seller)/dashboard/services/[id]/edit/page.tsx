import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import ServiceForm from '../../ServiceForm';

interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Edit Service — Dashboard | iBuyNaija` };
}

export default async function EditServicePage({ params }: PageProps) {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { id } = await params;

  const [svcRes, schedRes, catRes] = await Promise.all([
    pool.query(
      `SELECT so.id, so.name, so.category_id, so.description, so.price_type,
              so.price, so.price_from, so.duration_minutes, so.location_type,
              so.photos, so.status
       FROM service_offerings so
       WHERE so.id = $1 AND so.provider_id = $2`,
      [id, sellerId],
    ),
    pool.query(
      `SELECT day_of_week, start_time::text, end_time::text
       FROM availability_schedules WHERE service_id = $1 ORDER BY day_of_week`,
      [id],
    ),
    pool.query(`SELECT id, name FROM categories ORDER BY name`),
  ]);

  if (svcRes.rows.length === 0) notFound();
  const r = svcRes.rows[0];

  const initial = {
    id:               r.id,
    name:             r.name,
    category_id:      r.category_id,
    description:      r.description,
    price_type:       r.price_type as 'fixed' | 'quote',
    price:            r.price != null ? parseFloat(r.price) : null,
    price_from:       r.price_from != null ? parseFloat(r.price_from) : null,
    duration_minutes: r.duration_minutes as number | null,
    location_type:    r.location_type as 'at_provider' | 'provider_travels',
    photos:           r.photos as string[],
    status:           r.status as 'active' | 'inactive',
    schedules:        schedRes.rows.map(s => ({
      day_of_week: s.day_of_week as number,
      start_time:  s.start_time.slice(0, 5),
      end_time:    s.end_time.slice(0, 5),
    })),
  };

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>
        <Link
          href="/dashboard/services"
          style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}
        >
          ← My Services
        </Link>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 28px' }}>
          Edit Service
        </h1>
        <ServiceForm categories={catRes.rows} initial={initial} />
      </main>
    </>
  );
}
