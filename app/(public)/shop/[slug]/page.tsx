import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import ActivityBadge from '@/components/ui/ActivityBadge';
import ProductGrid from '@/components/listing/ProductGrid';
import JsonLd from '@/components/JsonLd';
import ShareButton from '@/components/listing/ShareButton';
import { buildLocalBusinessJsonLd } from '@/lib/structured-data';
import { getSellerProfile, getListingsBySeller } from '@/lib/queries';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ibuynaija.com';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const seller = await getSellerProfile(slug).catch(() => null);
  if (!seller) return { title: 'Shop not found | iBuyNaija' };
  return {
    title: `${seller.business_name} | iBuyNaija`,
    description: seller.tagline ?? `Shop ${seller.business_name} on iBuyNaija — Made in Nigeria marketplace`,
  };
}

export default async function SellerProfilePage({ params }: PageProps) {
  const { slug } = await params;

  const [seller, listings] = await Promise.all([
    getSellerProfile(slug).catch(() => null),
    getListingsBySeller(slug, 24).catch(() => []),
  ]);

  if (!seller) notFound();

  const initials = seller.business_name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const memberSince = new Date(seller.date_created).getFullYear();
  const avgRating = seller.rating_count > 0
    ? ((parseFloat(seller.avg_experience) + parseFloat(seller.avg_quality)) / 2).toFixed(1)
    : null;

  const shareSquareUrl = `${APP_URL}/api/share/seller/${seller.slug}?format=square`;
  const shareVerticalUrl = `${APP_URL}/api/share/seller/${seller.slug}?format=vertical`;

  return (
    <>
      <JsonLd
        data={buildLocalBusinessJsonLd({
          business_name: seller.business_name,
          slug: seller.slug,
          state: seller.state,
          city_area: seller.city_area,
          verified_status: seller.verified_status,
          avg_experience: parseFloat(seller.avg_experience) || 0,
          avg_quality: parseFloat(seller.avg_quality) || 0,
          rating_count: seller.rating_count,
        })}
      />
      <Navbar />
      <main style={{ background: '#F7F1E3', minHeight: '100vh' }}>
        {/* Hero banner */}
        <div style={{
          background: 'linear-gradient(150deg, #1B2A4A 0%, #2C426B 100%)',
          padding: '48px 24px 64px',
        }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {/* Breadcrumb */}
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: 'rgba(247,241,227,0.5)', marginBottom: 28 }}>
              <Link href="/" style={{ color: 'rgba(247,241,227,0.5)', textDecoration: 'none' }}>Home</Link>
              <span style={{ margin: '0 8px' }}>›</span>
              <span style={{ color: 'rgba(247,241,227,0.7)' }}>{seller.business_name}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div style={{
                width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
                background: seller.logo_photo_url
                  ? 'transparent'
                  : 'rgba(217,160,45,0.15)',
                border: '2px solid rgba(217,160,45,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {seller.logo_photo_url ? (
                  <img
                    src={seller.logo_photo_url}
                    alt={seller.business_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 32, color: '#D9A02D' }}>
                    {initials}
                  </span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                  <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: '#F7F1E3', margin: 0, lineHeight: 1.15 }}>
                    {seller.business_name}
                  </h1>
                  {seller.verified_status    && <VerifiedBadge size="md" />}
                  {seller.badge_trending    && <ActivityBadge variant="trending"   size="md" />}
                  {seller.badge_top_seller  && <ActivityBadge variant="top_seller" size="md" />}
                </div>

                {seller.tagline && (
                  <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 16, color: 'rgba(247,241,227,0.7)', margin: '0 0 12px', lineHeight: 1.5 }}>
                    {seller.tagline}
                  </p>
                )}

                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: 'rgba(247,241,227,0.45)' }}>
                  {seller.city_area}, {seller.state} · Member since {memberSince}
                </div>
              </div>

              {/* Stats + Share */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-end', minWidth: 200 }}>
                {/* Stats pills */}
                <div style={{ display: 'flex', gap: 12 }}>
                  {seller.sold_count > 0 && (
                    <div style={{
                      background: 'rgba(247,241,227,0.08)',
                      border: '1px solid rgba(247,241,227,0.12)',
                      borderRadius: 10, padding: '10px 16px', textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#F7F1E3' }}>
                        {seller.sold_count}
                      </div>
                      <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: 'rgba(247,241,227,0.45)', marginTop: 2 }}>
                        Orders
                      </div>
                    </div>
                  )}
                  {avgRating && (
                    <div style={{
                      background: 'rgba(247,241,227,0.08)',
                      border: '1px solid rgba(247,241,227,0.12)',
                      borderRadius: 10, padding: '10px 16px', textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#D9A02D' }}>
                        ★ {avgRating}
                      </div>
                      <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: 'rgba(247,241,227,0.45)', marginTop: 2 }}>
                        {seller.rating_count} review{seller.rating_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>

                {/* Share button — only shown when seller has at least one listing */}
                <div style={{ width: 200 }}>
                  {listings.length > 0 ? (
                    <ShareButton
                      squareUrl={`/api/share/seller/${seller.slug}?format=square`}
                      verticalUrl={`/api/share/seller/${seller.slug}?format=vertical`}
                      downloadFilename={`ibuynaija-${seller.slug}`}
                      shareTitle={seller.business_name}
                      shareText={`Shop ${seller.business_name} on iBuyNaija — authentic Made in Nigeria products`}
                      pageUrl={`${APP_URL}/shop/${seller.slug}?ref=s_${seller.id}`}
                    />
                  ) : (
                    <div style={{
                      background: 'rgba(247,241,227,0.07)',
                      border: '1px solid rgba(247,241,227,0.15)',
                      borderRadius: 10, padding: '12px 16px',
                    }}>
                      <p style={{
                        fontFamily: "'Hanken Grotesk',sans-serif",
                        fontSize: 12, color: 'rgba(247,241,227,0.5)',
                        margin: '0 0 8px', lineHeight: 1.45,
                      }}>
                        Add your first listing to unlock shop sharing.
                      </p>
                      <Link
                        href="/dashboard/listings/new"
                        style={{
                          fontFamily: "'Space Grotesk',sans-serif",
                          fontWeight: 600, fontSize: 12,
                          color: '#D9A02D', textDecoration: 'none',
                        }}
                      >
                        Add a listing →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        {seller.description && (
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 0' }}>
            <div style={{
              background: '#fff',
              border: '1px solid rgba(27,42,74,0.08)',
              borderRadius: 14, padding: '24px 28px',
            }}>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                About
              </div>
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: '#1B2A4A', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {seller.description}
              </p>
            </div>
          </div>
        )}

        {/* Listings */}
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 64px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A', margin: 0 }}>
              Active Listings
            </h2>
            {listings.length > 0 && (
              <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
                {listings.length} product{listings.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <ProductGrid
            listings={listings}
            emptyMessage={`${seller.business_name} has no active listings right now.`}
          />
        </section>
      </main>
    </>
  );
}
