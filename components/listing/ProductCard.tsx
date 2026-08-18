import Link from 'next/link';
import NaijaSeal from '@/components/ui/NaijaSeal';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import ActivityBadge from '@/components/ui/ActivityBadge';
import type { ListingRow } from '@/lib/queries';
import { formatNaira } from '@/lib/format';
import { applyPromotion } from '@/lib/promotions';

interface ProductCardProps {
  listing: ListingRow;
}

export default function ProductCard({ listing }: ProductCardProps) {
  const isSold = listing.status === 'sold' || listing.status === 'expired';

  const promoInfo = listing.promo_id
    ? { promo_discount_type: listing.promo_discount_type!, promo_discount_value: listing.promo_discount_value! }
    : null;
  const effectivePrice = applyPromotion(listing.price, promoInfo);
  const hasDiscount    = effectivePrice !== null;

  const displayPrice  = hasDiscount ? formatNaira(effectivePrice) : (formatNaira(listing.price) ?? 'Price on request');
  const originalPrice = hasDiscount ? formatNaira(listing.price) : null;

  const avgRating = listing.avg_experience > 0
    ? ((listing.avg_experience + listing.avg_quality) / 2).toFixed(1)
    : null;

  return (
    <Link
      href={`/listing/${listing.id}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: isSold ? '#EFE6D2' : '#FFFFFF',
        border: '1px solid rgba(27,42,74,0.10)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(27,42,74,0.05)',
        opacity: isSold ? 0.7 : 1,
        transition: 'box-shadow 0.15s, transform 0.15s',
        cursor: 'pointer',
        height: '100%',
      }}>
        {/* Image area — 4:5 portrait crop on cards */}
        <div style={{ position: 'relative', aspectRatio: '4/5', overflow: 'hidden', background: '#EFE6D2' }}>
          {listing.photos && listing.photos.length > 0 ? (
            <img
              src={listing.photos[listing.cover_photo_index ?? 0] ?? listing.photos[0]}
              alt={listing.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, #EFE6D2, #D9CEBA)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 32 }}>{getCategoryEmoji(listing.category_slug)}</span>
            </div>
          )}

          {/* Sold overlay */}
          {isSold && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(27,42,74,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16,
                color: '#F7F1E3', letterSpacing: 2, textTransform: 'uppercase',
                border: '2px solid rgba(247,241,227,0.7)', padding: '4px 12px', borderRadius: 4,
              }}>Sold</span>
            </div>
          )}

          {/* Sale badge */}
          {hasDiscount && !isSold && (
            <div style={{
              position: 'absolute', top: 9, left: 9,
              background: '#C1542C', color: '#F7F1E3',
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 10,
              letterSpacing: 1, padding: '3px 7px', borderRadius: 4,
            }}>
              SALE
            </div>
          )}

          {/* Category label bottom-left */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: 10 }}>
            <span style={{
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 10,
              letterSpacing: 1.5, textTransform: 'uppercase',
              color: 'rgba(247,241,227,0.62)', textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}>
              {listing.category_name.split(' ')[0]}
            </span>
          </div>

          {/* NaijaSeal top-right */}
          <div style={{ position: 'absolute', top: 7, right: 7 }}>
            <NaijaSeal size={52} />
          </div>

          {/* Verified badge top-left (only when no sale badge) */}
          {listing.verified_status && !hasDiscount && (
            <div style={{ position: 'absolute', top: 9, left: 9 }}>
              <VerifiedBadge />
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '9px 10px 11px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
          <div style={{
            fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 13.5,
            lineHeight: 1.25, color: '#1B2A4A', minHeight: 34,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {listing.title}
          </div>

          {/* Description — 2-line clamp; full text on detail page only */}
          {listing.description && (
            <div style={{
              fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11.5,
              color: '#6B6456', lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {listing.description}
            </div>
          )}

          {/* Activity badges */}
          {(listing.badge_trending || listing.badge_top_seller) && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {listing.badge_trending   && <ActivityBadge variant="trending"   size="sm" />}
              {listing.badge_top_seller && <ActivityBadge variant="top_seller" size="sm" />}
            </div>
          )}

          {/* Location */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#6B6456' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M12 21s-7-5.6-7-11a7 7 0 1114 0c0 5.4-7 11-7 11z" stroke="#C1542C" strokeWidth="2" />
              <circle cx="12" cy="10" r="2.4" fill="#C1542C" />
            </svg>
            <span>{listing.city_area}, {listing.state}</span>
          </div>

          {/* Price + rating */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 1, gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
                color: hasDiscount ? '#C1542C' : (listing.price == null ? '#8A7E66' : '#1B2A4A'),
                fontStyle: listing.price == null && !hasDiscount ? 'italic' : 'normal',
                fontSize: listing.price == null && !hasDiscount ? '13px' : '16px',
              }}>
                {displayPrice}
              </span>
              {originalPrice && (
                <span style={{
                  fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500,
                  color: '#8A7E66', fontSize: '12px',
                  textDecoration: 'line-through',
                }}>
                  {originalPrice}
                </span>
              )}
            </div>
            {avgRating && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#1B2A4A' }}>
                <span style={{ color: '#D9A02D' }}>★</span>{avgRating}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function getCategoryEmoji(slug: string): string {
  const map: Record<string, string> = {
    'fashion-textiles':           '🧵',
    'beauty-personal-care':       '✨',
    'hair-wigs-weaves':           '💇',
    'furniture-interior-decor':   '🪑',
    'food-spices-pantry':         '🌶️',
    'arts-crafts-home-decor':     '🎨',
    'jewelry-accessories':        '💍',
    'agro-products':              '🌾',
    'creative-media':             '🎬',
    'cultural-heritage-souvenirs':'🏺',
    'health-wellness-herbs':      '🌿',
    'bags-leather-goods':         '👜',
    'kids-baby':                  '🧸',
  };
  return map[slug] ?? '🛍️';
}
