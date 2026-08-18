import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ProductGrid from '@/components/listing/ProductGrid';
import { getListingsByCategory, getCategories } from '@/lib/queries';
import JsonLd from '@/components/JsonLd';
import { buildListingItemListJsonLd } from '@/lib/structured-data';
import type { Metadata } from 'next';
import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ibuynaija.com';

// Known category slugs — only these match this route
const VALID_CATEGORY_SLUGS = new Set([
  'fashion-textiles', 'beauty-personal-care', 'hair-wigs-weaves',
  'furniture-interior-decor', 'food-spices-pantry', 'arts-crafts-home-decor',
  'jewelry-accessories', 'agro-products', 'creative-media',
  'cultural-heritage-souvenirs', 'health-wellness-herbs',
  'bags-leather-goods', 'kids-baby',
]);

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ state?: string; city?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  if (!VALID_CATEGORY_SLUGS.has(category)) return {};
  const name = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    title: `${name} — Made in Nigeria | iBuyNaija`,
    description: `Browse authentic Nigerian-made ${name.toLowerCase()} from verified sellers.`,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;
  const sp = await searchParams;

  if (!VALID_CATEGORY_SLUGS.has(category)) notFound();

  const buyerState = sp.state ?? '';
  const buyerCity = sp.city ?? '';

  const [listings, categories] = await Promise.all([
    getListingsByCategory(category, buyerCity, buyerState, 48, 0),
    getCategories('marketplace'),
  ]);

  const currentCat = categories.find((c: { slug: string; name: string }) => c.slug === category);
  const categoryName = currentCat?.name ?? category.replace(/-/g, ' ');
  const activeCount = listings.filter((l) => l.status === 'active').length;

  const pageUrl = `${APP_URL}/${category}${buyerState ? `?state=${buyerState}${buyerCity ? `&city=${buyerCity}` : ''}` : ''}`;

  return (
    <>
      <JsonLd
        data={buildListingItemListJsonLd(categoryName, pageUrl, listings)}
      />
      <Navbar />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
          <Link href="/" style={{ color: '#8A7E66', textDecoration: 'none' }}>Home</Link>
          <span>›</span>
          <span style={{ color: '#1B2A4A', fontWeight: 600 }}>{categoryName}</span>
        </div>

        {/* Category header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: '#1B2A4A', margin: '0 0 8px' }}>
            {categoryName}
          </h1>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: 0 }}>
            {activeCount} active listing{activeCount !== 1 ? 's' : ''} · sorted by Verified sellers near you first
          </p>
        </div>

        {/* Location banner */}
        {!buyerState && (
          <div style={{ background: 'rgba(193,84,44,0.08)', border: '1px solid rgba(193,84,44,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 21s-7-5.6-7-11a7 7 0 1114 0c0 5.4-7 11-7 11z" stroke="#C1542C" strokeWidth="2"/>
              <circle cx="12" cy="10" r="2.4" fill="#C1542C"/>
            </svg>
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A' }}>
              Set your location to see nearby sellers first.{' '}
              <Link href={`/${category}?state=Lagos&city=Lagos`} style={{ color: '#C1542C', fontWeight: 600, textDecoration: 'none' }}>
                Browse as Lagos →
              </Link>
            </span>
          </div>
        )}

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {categories.map((cat: { slug: string; name: string }) => (
            <Link key={cat.slug} href={`/${cat.slug}`} style={{ textDecoration: 'none' }}>
              <div style={{
                fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 13,
                padding: '6px 14px', borderRadius: 999,
                background: cat.slug === category ? '#1B2A4A' : 'rgba(27,42,74,0.07)',
                color: cat.slug === category ? '#F7F1E3' : '#1B2A4A',
                cursor: 'pointer',
              }}>
                {cat.name.split(' ')[0]}
              </div>
            </Link>
          ))}
        </div>

        <ProductGrid listings={listings} emptyMessage={`No ${categoryName} listings yet.`} />
      </main>
    </>
  );
}
