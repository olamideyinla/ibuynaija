import Navbar from '@/components/Navbar';
import ProductGrid from '@/components/listing/ProductGrid';
import { getProducts, getCategories } from '@/lib/queries';
import JsonLd from '@/components/JsonLd';
import { buildListingItemListJsonLd } from '@/lib/structured-data';
import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ibuynaija.com';

export const metadata: Metadata = {
  title: 'Made-in-Nigeria Products | iBuyNaija',
  description: 'Browse every Made-in-Nigeria product — Ankara, shea butter, handmade furniture, spices and more.',
};

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { category = '', q = '' } = await searchParams;

  const [productCategories, listings] = await Promise.all([
    getCategories('marketplace'),
    getProducts(q, category, '', '', 48, 0).catch(() => []),
  ]);

  const activeCategoryName = productCategories.find((c) => c.slug === category)?.name ?? category;
  const listName = category
    ? `Made-in-Nigeria ${activeCategoryName}`
    : q
    ? `Products: ${q}`
    : 'Made-in-Nigeria Products';
  const listUrl = `${APP_URL}/products${
    category ? `?category=${category}` : q ? `?q=${encodeURIComponent(q)}` : ''
  }`;

  return (
    <>
      {listings.length > 0 && (
        <JsonLd data={buildListingItemListJsonLd(listName, listUrl, listings)} />
      )}
      <Navbar />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, fontSize: 32,
            color: '#1B2A4A', margin: '0 0 8px',
          }}>
            {category ? activeCategoryName : 'Made-in-Nigeria Products'}
          </h1>
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 16, color: '#8A7E66', margin: 0,
          }}>
            Every item made in Nigeria — Ankara, shea butter, handmade furniture, spices and more.
          </p>
        </div>

        {/* Search bar */}
        <form method="GET" action="/products" style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          {category && <input type="hidden" name="category" value={category} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search products…"
            style={{
              flex: 1, padding: '11px 16px',
              borderRadius: 10, border: '1px solid rgba(27,42,74,0.2)',
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 15, color: '#1B2A4A', background: '#fff',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '11px 20px', background: '#1B2A4A', color: '#F7F1E3',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, fontSize: 14,
              borderRadius: 10, border: 'none', cursor: 'pointer',
            }}
          >
            Search
          </button>
          {(q || category) && (
            <a
              href="/products"
              style={{
                padding: '11px 16px',
                background: 'rgba(27,42,74,0.06)', color: '#8A7E66',
                fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14,
                borderRadius: 10, textDecoration: 'none',
                display: 'flex', alignItems: 'center',
              }}
            >
              Clear
            </a>
          )}
        </form>

        {/* Category chips */}
        {productCategories.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
            <a
              href="/products"
              style={{
                padding: '6px 14px', borderRadius: 20,
                border: `1px solid ${!category ? '#1B2A4A' : 'rgba(27,42,74,0.2)'}`,
                background: !category ? '#1B2A4A' : 'transparent',
                color: !category ? '#F7F1E3' : '#8A7E66',
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 13, fontWeight: 600,
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              All
            </a>
            {productCategories.map((cat) => {
              const active = cat.slug === category;
              return (
                <a
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  style={{
                    padding: '6px 14px', borderRadius: 20,
                    border: `1px solid ${active ? '#1B2A4A' : 'rgba(27,42,74,0.2)'}`,
                    background: active ? '#1B2A4A' : 'transparent',
                    color: active ? '#F7F1E3' : '#8A7E66',
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    fontSize: 13, fontWeight: 600,
                    textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  {cat.name}
                </a>
              );
            })}
          </div>
        )}

        {/* Results */}
        {listings.length > 0 && (
          <p style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 14, color: '#8A7E66', marginBottom: 20,
          }}>
            {listings.length} product{listings.length !== 1 ? 's' : ''}
            {q ? ` for "${q}"` : ''}
            {category ? ` in ${activeCategoryName}` : ''}
          </p>
        )}
        <ProductGrid
          listings={listings}
          emptyMessage={
            q
              ? `No products found for "${q}"${category ? ` in ${activeCategoryName}` : ''}.`
              : category
              ? `No products in ${activeCategoryName} yet — check back soon.`
              : 'No products listed yet — check back soon.'
          }
        />
      </main>
    </>
  );
}
