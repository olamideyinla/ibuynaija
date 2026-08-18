import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import NaijaSeal from '@/components/ui/NaijaSeal';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import ActivityBadge from '@/components/ui/ActivityBadge';
import VariantPicker from '@/components/listing/VariantPicker';
import ShareButton from '@/components/listing/ShareButton';
import EnquireButton from '@/components/listing/EnquireButton';
import { getListingById, getRatingsByListing, getVariantsByListing } from '@/lib/queries';
import JsonLd from '@/components/JsonLd';
import { buildProductJsonLd } from '@/lib/structured-data';
import type { Metadata } from 'next';
import { formatNaira } from '@/lib/format';
import { applyPromotion } from '@/lib/promotions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id).catch(() => null);
  if (!listing) return { title: 'Listing not found | iBuyNaija' };
  return {
    title: `${listing.title} | iBuyNaija`,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: `${formatNaira(listing.price) ?? 'Price on request'} · Made in Nigeria`,
      images: (() => {
        const idx = listing.cover_photo_index ?? 0;
        const url = listing.photos?.[idx] ?? listing.photos?.[0];
        return url ? [{ url, width: 1200, height: 630 }] : [];
      })(),
    },
  };
}

export default async function ListingPage({ params }: PageProps) {
  const { id } = await params;
  const [listing, reviews, variants] = await Promise.all([
    getListingById(id).catch(() => null),
    getRatingsByListing(id).catch(() => []),
    getVariantsByListing(id).catch(() => []),
  ]);
  if (!listing) notFound();
  const isSold = listing.status === 'sold' || listing.status === 'expired';

  const promoInfo = listing.promo_id
    ? { promo_discount_type: listing.promo_discount_type!, promo_discount_value: listing.promo_discount_value! }
    : null;
  const effectivePrice = applyPromotion(listing.price, promoInfo);
  const hasDiscount    = effectivePrice !== null;

  const price          = hasDiscount ? formatNaira(effectivePrice) : formatNaira(listing.price);
  const avgRating = listing.rating_count > 0
    ? ((listing.avg_experience + listing.avg_quality) / 2).toFixed(1)
    : null;
  const sellerInitials = listing.business_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const yearJoined = new Date(listing.date_posted).getFullYear();
  return (
    <>
      <JsonLd data={buildProductJsonLd(listing)} />
      <Navbar />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
          <Link href="/" style={{ color: '#8A7E66', textDecoration: 'none' }}>Home</Link>
          <span>›</span>
          <Link href={`/${listing.category_slug}`} style={{ color: '#8A7E66', textDecoration: 'none' }}>{listing.category_name}</Link>
          <span>›</span>
          <span style={{ color: '#1B2A4A', fontWeight: 600 }}>{listing.title.slice(0, 40)}{listing.title.length > 40 ? '…' : ''}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 40, alignItems: 'start' }}>
          <div>
            <div style={{ position: 'relative', aspectRatio: '1/1', background: '#EFE6D2', borderRadius: 16, overflow: 'hidden' }}>
              {(() => {
                const coverIdx = listing.cover_photo_index ?? 0;
                const coverUrl = listing.photos?.[coverIdx] ?? listing.photos?.[0];
                return coverUrl ? (
                  <img src={coverUrl} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#EFE6D2,#D9CEBA)', fontSize: 64 }}>
                    🛍️
                  </div>
                );
              })()}
              {isSold && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(27,42,74,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: '#F7F1E3', border: '2px solid rgba(247,241,227,0.8)', padding: '6px 20px', borderRadius: 6, letterSpacing: 3 }}>SOLD</span>
                </div>
              )}
              <div style={{ position: 'absolute', top: 12, right: 12 }}><NaijaSeal size={64} /></div>
              {listing.verified_status && (<div style={{ position: 'absolute', top: 14, left: 14 }}><VerifiedBadge size="md" /></div>)}
            </div>
            {listing.photos && listing.photos.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {listing.photos.map((photo: string, i: number) => {
                  const isCover = i === (listing.cover_photo_index ?? 0);
                  return (
                    <div key={i} style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', border: isCover ? '2px solid #C1542C' : '2px solid transparent' }}>
                      <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#C1542C', marginBottom: 10 }}>{listing.category_name}</div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', lineHeight: 1.2, margin: '0 0 16px' }}>{listing.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderTop: '1px solid rgba(27,42,74,0.1)', borderBottom: '1px solid rgba(27,42,74,0.1)', marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Price</div>
                {price ? (
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 32, color: hasDiscount ? '#C1542C' : '#1B2A4A', lineHeight: 1 }}>{price}</div>
                    {hasDiscount && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 16, color: '#8A7E66', textDecoration: 'line-through' }}>{formatNaira(listing.price)}</span>
                        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12, color: '#fff', background: '#C1542C', padding: '2px 8px', borderRadius: 4 }}>
                          {listing.promo_discount_type === 'percentage'
                            ? `${listing.promo_discount_value}% OFF`
                            : `${formatNaira(listing.promo_discount_value)} OFF`}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (<div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 16, color: '#8A7E66', fontStyle: 'italic' }}>Price on request — enquire below</div>)}
              </div>
              {avgRating && (
                <div style={{ flex: 1, borderLeft: '1px solid rgba(27,42,74,0.1)', paddingLeft: 16 }}>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Rating</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ color: '#D9A02D', fontSize: 24 }}>★</span>
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: '#1B2A4A' }}>{avgRating}</span>
                    <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>/ 5 · {listing.rating_count} review{listing.rating_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{ background: 'rgba(217,160,45,0.08)', border: '1px solid rgba(217,160,45,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🏦</span>
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A', margin: 0, lineHeight: 1.5 }}>
                <strong>Direct bank transfer.</strong> Once you place an order, you&apos;ll see the seller&apos;s bank details and pay them directly. iBuyNaija never holds your money.
              </p>
            </div>
            {!isSold ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {listing.price != null && variants.length > 0 && (
                  <VariantPicker listingId={listing.id} variants={variants} />
                )}
                <EnquireButton
                  listingId={listing.id}
                  listingTitle={listing.title}
                  sellerWhatsapp={listing.whatsapp_number ?? null}
                />
                <ShareButton
                  squareUrl={`/api/share/listing/${listing.id}?format=square`}
                  verticalUrl={`/api/share/listing/${listing.id}?format=vertical`}
                  downloadFilename={`ibuynaija-${listing.id}`}
                  shareTitle={listing.title}
                  shareText={`${listing.title} by ${listing.business_name} — Made in Nigeria · iBuyNaija`}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                <div style={{ background: 'rgba(27,42,74,0.06)', borderRadius: 10, padding: '14px 16px', textAlign: 'center', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66' }}>This listing is no longer available.</div>
                <ShareButton
                  squareUrl={`/api/share/listing/${listing.id}?format=square`}
                  verticalUrl={`/api/share/listing/${listing.id}?format=vertical`}
                  downloadFilename={`ibuynaija-${listing.id}`}
                  shareTitle={listing.title}
                  shareText={`${listing.title} by ${listing.business_name} — Made in Nigeria · iBuyNaija`}
                />
              </div>
            )}
            {listing.condition && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Condition</div>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: '#1B2A4A', background: 'rgba(27,42,74,0.07)', padding: '4px 10px', borderRadius: 6 }}>{listing.condition}</span>
              </div>
            )}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>About this listing</div>
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: '#1B2A4A', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{listing.description}</p>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '20px', marginBottom: 28 }}>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', fontWeight: 500, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Seller</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1B2A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: '#F7F1E3', flexShrink: 0 }}>{sellerInitials}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A' }}>{listing.business_name}</span>
                    {listing.badge_trending    && <ActivityBadge variant="trending"   size="sm" />}
                    {listing.badge_top_seller  && <ActivityBadge variant="top_seller" size="sm" />}
                  </div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>Member since {yearJoined} · {listing.city_area}, {listing.state}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'rgba(27,42,74,0.04)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A' }}>{listing.avg_experience ? listing.avg_experience.toFixed(1) : 'N/A'}</div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginTop: 2 }}>Experience</div>
                </div>
                <div style={{ background: 'rgba(27,42,74,0.04)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A' }}>{listing.avg_quality ? listing.avg_quality.toFixed(1) : 'N/A'}</div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginTop: 2 }}>Quality</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {reviews && reviews.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A', marginBottom: 24 }}>Reviews ({reviews.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {reviews.map((r: { id: string; reviewer_name?: string; experience_score: number; quality_score: number; review_text?: string; created_at: string }) => (
                <div key={r.id} style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EFE6D2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: '#8A7E66' }}>{(r.reviewer_name ?? 'Buyer').slice(0, 2).toUpperCase()}</div>
                    <div>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: '#1B2A4A' }}>{r.reviewer_name ?? 'Buyer'}</div>
                      <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>{new Date(r.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>★ Exp: <strong style={{ color: '#1B2A4A' }}>{r.experience_score}/5</strong></span>
                    <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>★ Quality: <strong style={{ color: '#1B2A4A' }}>{r.quality_score}/5</strong></span>
                  </div>
                  {r.review_text && <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', margin: 0, lineHeight: 1.6 }}>{r.review_text}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}