import Navbar from '@/components/Navbar';
import TrustStrip from '@/components/home/TrustStrip';
import ProductGrid from '@/components/listing/ProductGrid';
import ServiceCard from '@/components/service/ServiceCard';
import NaijaSeal from '@/components/ui/NaijaSeal';
import Link from 'next/link';
import { getTrendingListings, getRecentListings } from '@/lib/queries';
import { pool } from '@/lib/db';
import JsonLd from '@/components/JsonLd';
import { buildWebSiteJsonLd, buildListingItemListJsonLd } from '@/lib/structured-data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'iBuyNaija — Made in Nigeria marketplace',
  description: 'Every item made in Nigeria. Bought with trust. Shop verified Nigerian makers.',
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ibuynaija.com';

export default async function HomePage() {
  const [listings, recentListings, servicesResult] = await Promise.all([
    getTrendingListings('', '', 24).catch(() => []),
    getRecentListings(12).catch(() => []),
    pool.query(
      `SELECT so.id, so.name, so.description, so.price_type,
              so.price, so.price_from, so.duration_minutes,
              so.location_type, so.photos,
              c.name AS category_name,
              s.business_name, s.state, s.city_area, s.verified_status
       FROM service_offerings so
       JOIN sellers    s ON s.id = so.provider_id
       JOIN categories c ON c.id = so.category_id
       WHERE so.status = 'active'
       ORDER BY s.verified_status DESC, so.date_created DESC
       LIMIT 6`,
    ).catch(() => ({ rows: [] })),
  ]);

  const featuredServices = servicesResult.rows.map((r) => ({
    id:               r.id,
    name:             r.name,
    description:      r.description,
    price_type:       r.price_type as 'fixed' | 'quote',
    price:            r.price != null ? parseFloat(r.price) : null,
    price_from:       r.price_from != null ? parseFloat(r.price_from) : null,
    duration_minutes: r.duration_minutes as number | null,
    location_type:    r.location_type as 'at_provider' | 'provider_travels',
    photos:           r.photos as string[],
    category_name:    r.category_name as string,
    provider: {
      business_name:   r.business_name as string,
      state:           r.state as string,
      city_area:       r.city_area as string,
      verified_status: r.verified_status as boolean,
    },
  }));

  return (
    <>
      {buildWebSiteJsonLd().map((schema, i) => (
        <JsonLd key={i} data={schema} />
      ))}
      {listings.length > 0 && (
        <JsonLd
          data={buildListingItemListJsonLd(
            'Trending across Nigeria',
            APP_URL,
            listings,
          )}
        />
      )}
      {recentListings.length > 0 && <JsonLd data={buildListingItemListJsonLd('Recently Added across Nigeria', `${APP_URL}/#recently-added`, recentListings)} />}
      <Navbar />
      <main style={{ minHeight: '100vh', background: '#F7F1E3' }}>

        {/* HERO */}
        <section style={{
          background: 'linear-gradient(150deg, #1B2A4A 0%, #2C426B 100%)',
          padding: '56px 24px 64px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Watermark seal */}
          <div style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', opacity: 0.12 }}>
            <NaijaSeal size={240} />
          </div>

          <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(217,160,45,0.15)', border: '1px solid rgba(217,160,45,0.35)', borderRadius: 999, padding: '4px 12px', marginBottom: 20 }}>
              <span style={{ fontSize: 11 }}>🇳🇬</span>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 11, color: '#D9A02D', letterSpacing: 1 }}>EXCLUSIVELY MADE IN NIGERIA</span>
            </div>

            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 'clamp(32px, 5vw, 56px)', color: '#F7F1E3', lineHeight: 1.1, maxWidth: 620, margin: '0 0 16px' }}>
              Only the real thing.<br />
              <span style={{ color: '#D9A02D' }}>Made in Nigeria.</span>
            </h1>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 16, color: 'rgba(247,241,227,0.75)', maxWidth: 480, lineHeight: 1.6, margin: '0 0 32px' }}>
              Shop Ankara, shea butter, handmade furniture, authentic spices and more — direct from Nigerian makers to your door.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/search" style={{
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15,
                background: '#C1542C', color: '#F7F1E3',
                padding: '13px 28px', borderRadius: 10, textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(193,84,44,0.4)',
              }}>
                Browse the market
              </Link>
              <Link href="/how-it-works" style={{
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15,
                background: 'rgba(247,241,227,0.1)', color: '#F7F1E3',
                border: '1px solid rgba(247,241,227,0.25)',
                padding: '13px 28px', borderRadius: 10, textDecoration: 'none',
              }}>
                How it works
              </Link>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <TrustStrip />

        {/* TRENDING */}
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '8px 24px 56px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A', margin: 0 }}>
              Trending across Nigeria
            </h2>
            <Link href="/products" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', textDecoration: 'none', fontWeight: 600 }}>
              See all →
            </Link>
          </div>
          <ProductGrid listings={listings} emptyMessage="No listings yet — check back soon." />
        </section>

        {/* RECENTLY ADDED */}
        <section id="recently-added" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 64px' }}>
          <div style={{ borderTop: '1px solid rgba(27,42,74,0.08)', paddingTop: 40, marginBottom: 20, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A', margin: '0 0 4px' }}>
                Recently Added
              </h2>
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: 0 }}>
                New listings from across Nigeria
              </p>
            </div>
            <Link href="/products" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
              Browse all →
            </Link>
          </div>
          <ProductGrid listings={recentListings} emptyMessage="No recent listings." />
        </section>
        {/* LOCAL SERVICES */}
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 64px' }}>
          <div style={{ borderTop: '1px solid rgba(27,42,74,0.08)', paddingTop: 40, marginBottom: 20, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A', margin: '0 0 4px' }}>
                Local Services
              </h2>
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: 0 }}>
                Book skilled Nigerian providers near you
              </p>
            </div>
            <Link href="/services" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
              Browse all →
            </Link>
          </div>
          {featuredServices.length === 0 ? (
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66' }}>
              No services listed yet — check back soon.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {featuredServices.map(s => <ServiceCard key={s.id} {...s} />)}
            </div>
          )}
        </section>
      </main>

    </>
  );
}
