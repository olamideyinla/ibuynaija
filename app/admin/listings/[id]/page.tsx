import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin-auth';
import { pool } from '@/lib/db';
import CategoryPicker from './CategoryPicker';

interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Listing ${id.slice(0, 8)} — Admin | iBuyNaija` };
}

export default async function AdminListingDetailPage({ params }: PageProps) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const { id } = await params;

  const [listingRes, categoriesRes] = await Promise.all([
    pool.query(
      `SELECT l.id, l.title, l.description, l.price, l.status,
              l.made_in_nigeria, l.condition, l.date_posted, l.date_updated,
              l.category_id,
              c.name AS category_name,
              s.id AS seller_id, s.business_name, s.city_area, s.state
       FROM listings l
       JOIN categories c ON c.id = l.category_id
       JOIN sellers    s ON s.id = l.seller_id
       WHERE l.id = $1`,
      [id],
    ),
    pool.query(
      `SELECT id, name FROM categories WHERE section = 'marketplace' ORDER BY sort_order`,
    ),
  ]);

  if (listingRes.rows.length === 0) notFound();
  const l = listingRes.rows[0];
  const categories = categoriesRes.rows;

  const statusColour = l.status === 'active' ? '#2E7D32' : l.status === 'sold' ? '#1B2A4A' : '#8A7E66';

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      <Link
        href="/admin/listings"
        style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}
      >
        ← Listing reports
      </Link>

      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: '#1B2A4A', margin: '0 0 6px' }}>
        {l.title}
      </h1>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: statusColour, fontWeight: 600 }}>
          {l.status.toUpperCase()}
        </span>
        {!l.made_in_nigeria && (
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700, color: '#C1542C', background: 'rgba(193,84,44,0.1)', padding: '2px 8px', borderRadius: 4 }}>
            ⚠ NOT MiN
          </span>
        )}
        <a
          href={`/listing/${l.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A' }}
        >
          View public listing ↗
        </a>
      </div>

      {/* Seller */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Seller
        </div>
        <Link
          href={`/admin/verification/${l.seller_id}`}
          style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', fontWeight: 600, textDecoration: 'none' }}
        >
          {l.business_name}
        </Link>
        <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', marginLeft: 8 }}>
          {l.city_area}, {l.state}
        </span>
      </div>

      {/* Details */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Details
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A' }}>
          <div><span style={{ color: '#8A7E66' }}>Price: </span>{l.price != null ? `₦${Number(l.price).toLocaleString()}` : 'On request'}</div>
          <div><span style={{ color: '#8A7E66' }}>Condition: </span>{l.condition}</div>
          <div><span style={{ color: '#8A7E66' }}>Posted: </span>{new Date(l.date_posted).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          {l.date_updated && (
            <div><span style={{ color: '#8A7E66' }}>Updated: </span>{new Date(l.date_updated).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          )}
        </div>
      </div>

      {/* Category correction */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          Category
        </div>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 14px' }}>
          Current: <strong style={{ color: '#1B2A4A' }}>{l.category_name}</strong>
        </p>
        <CategoryPicker
          listingId={l.id}
          currentCategoryId={l.category_id}
          categories={categories}
        />
      </div>
    </main>
  );
}
