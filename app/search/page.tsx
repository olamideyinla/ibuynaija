import Navbar from '@/components/Navbar';
import ProductGrid from '@/components/listing/ProductGrid';
import ServiceCard from '@/components/service/ServiceCard';
import SearchFilters from '@/components/search/SearchFilters';
import { searchListings, searchServices } from '@/lib/queries';
import JsonLd from '@/components/JsonLd';
import { buildListingItemListJsonLd } from '@/lib/structured-data';
import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ibuynaija.com';

interface PageProps {
  searchParams: Promise<{ q?: string; state?: string; city?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = sp.q ?? '';
  return {
    title: q
      ? `"${q}" — iBuyNaija search`
      : 'Search Made-in-Nigeria products & services | iBuyNaija',
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const query      = (sp.q ?? '').trim();
  const buyerState = sp.state ?? '';
  const buyerCity  = sp.city ?? '';

  // Run queries when any filter is active (text query OR location)
  const hasFilters = query.length >= 2 || !!buyerState || !!buyerCity;

  const [listings, services] = hasFilters
    ? await Promise.all([
        searchListings(query, buyerCity, buyerState, 48, 0).catch(() => []),
        searchServices(query, buyerCity, buyerState, 24).catch(() => []),
      ])
    : [[], []];

  const locationLabel = [buyerCity, buyerState].filter(Boolean).join(', ');

  return (
    <>
      {listings.length > 0 && (
        <JsonLd
          data={buildListingItemListJsonLd(
            query ? `Search: ${query}` : 'Made-in-Nigeria products',
            `${APP_URL}/search?q=${encodeURIComponent(query)}`,
            listings,
          )}
        />
      )}
      <Navbar searchQuery={query} />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>

        {/* Heading */}
        <div style={{ marginBottom: 20 }}>
          {query ? (
            <>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 6px' }}>
                Results for &ldquo;{query}&rdquo;
                {locationLabel ? <span style={{ color: '#8A7E66', fontWeight: 500, fontSize: 20 }}> · {locationLabel}</span> : null}
              </h1>
              {hasFilters && (
                <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: 0 }}>
                  {listings.length} product{listings.length !== 1 ? 's' : ''} · {services.length} service{services.length !== 1 ? 's' : ''} found
                </p>
              )}
            </>
          ) : locationLabel ? (
            <>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 6px' }}>
                Sellers & services in {locationLabel}
              </h1>
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: 0 }}>
                {listings.length} product{listings.length !== 1 ? 's' : ''} · {services.length} service{services.length !== 1 ? 's' : ''} found
              </p>
            </>
          ) : (
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: 0 }}>
              Search Made-in-Nigeria products &amp; services
            </h1>
          )}
        </div>

        {/* Location filter */}
        <SearchFilters query={query} initialState={buyerState} initialCity={buyerCity} />

        {/* Empty prompt */}
        {!hasFilters && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#8A7E66' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15 }}>
              Type a product or service name above, or pick a location to browse.
            </p>
          </div>
        )}

        {/* Products section */}
        {hasFilters && (
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: '#1B2A4A', margin: 0 }}>
                Products
              </h2>
              <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
                {listings.length} found
              </span>
            </div>
            <ProductGrid
              listings={listings}
              emptyMessage={
                query
                  ? `No products matching "${query}"${locationLabel ? ` in ${locationLabel}` : ''}.`
                  : `No products found${locationLabel ? ` in ${locationLabel}` : ''}.`
              }
            />
          </section>
        )}

        {/* Services section */}
        {hasFilters && (
          <section style={{
            borderTop: listings.length > 0 ? '1px solid rgba(27,42,74,0.08)' : 'none',
            paddingTop: listings.length > 0 ? 32 : 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: '#1B2A4A', margin: 0 }}>
                Services
              </h2>
              <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
                {services.length} found
              </span>
            </div>
            {services.length === 0 ? (
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: 0 }}>
                {query
                  ? `No services matching "${query}"${locationLabel ? ` in ${locationLabel}` : ''}.`
                  : `No services found${locationLabel ? ` in ${locationLabel}` : ''}.`}
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                {services.map((s) => (
                  <ServiceCard key={s.id} {...s} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}
