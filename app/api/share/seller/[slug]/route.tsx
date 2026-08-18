import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import pool from '@/lib/db';

/* ── Fonts ───────────────────────────────────────────────────────────────── */

async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap&text=${encodeURIComponent(text)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; iBuyNaija/1.0)' },
        signal: AbortSignal.timeout?.(8000) },
    ).then(r => r.text());
    const match = css.match(/src: url\(([^)]+)\) format\(['"](?:woff2|truetype)['"]\)/);
    if (!match?.[1]) return null;
    return fetch(match[1], { signal: AbortSignal.timeout?.(8000) }).then(r => r.arrayBuffer());
  } catch {
    return null;
  }
}

const LATIN_CHARS =
  '₦ ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  ",.'\"-:()!?%+/·…";

let _notoFont: ArrayBuffer | null | undefined = undefined;
let _symbolsFont: ArrayBuffer | null | undefined = undefined;

const notoFontPromise    = loadGoogleFont('Noto Sans:wght@700', LATIN_CHARS);
const symbolsFontPromise = loadGoogleFont('Noto Sans Symbols 2', '★✓');

async function getNotoFont(): Promise<ArrayBuffer | null> {
  if (_notoFont !== undefined) return _notoFont;
  _notoFont = await notoFontPromise;
  return _notoFont;
}
async function getSymbolsFont(): Promise<ArrayBuffer | null> {
  if (_symbolsFont !== undefined) return _symbolsFont;
  _symbolsFont = await symbolsFontPromise;
  return _symbolsFont;
}

/* ── DB query ───────────────────────────────────────────────────────────── */

async function getSellerForShare(slug: string) {
  const { rows } = await pool.query(
    `WITH avg_r AS (
       SELECT l.seller_id,
         ROUND(AVG(r.buying_experience_score)::numeric, 1) AS avg_exp,
         ROUND(AVG(r.product_quality_score)::numeric, 1)   AS avg_quality,
         COUNT(*) AS rating_count
       FROM listings l
       JOIN ratings r ON r.listing_id = l.id
       GROUP BY l.seller_id
     ),
     order_cnt AS (
       SELECT seller_id, COUNT(*) AS sold_count
       FROM orders
       WHERE status != 'cancelled'
       GROUP BY seller_id
     )
     SELECT
       s.business_name, s.tagline, s.city_area, s.state,
       s.verified_status, s.logo_photo_url,
       s.date_created,
       COALESCE(oc.sold_count::int, 0)       AS sold_count,
       COALESCE(avg_r.avg_exp::float, 0)     AS avg_experience,
       COALESCE(avg_r.avg_quality::float, 0) AS avg_quality,
       COALESCE(avg_r.rating_count::int, 0)  AS rating_count
     FROM sellers s
     LEFT JOIN avg_r     ON avg_r.seller_id = s.id
     LEFT JOIN order_cnt oc ON oc.seller_id = s.id
     WHERE s.slug = $1`,
    [slug],
  );
  return rows[0] ?? null;
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function NaijaSeal({ size }: { size: number }) {
  const inner = Math.round(size * 0.77);
  const borderW = Math.max(2, Math.round(size * 0.027));
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'rgba(247,241,227,0.9)',
        border: `${borderW}px solid #D9A02D`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: 'rotate(-11deg)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: inner, height: inner, borderRadius: '50%',
          border: '1px solid rgba(217,160,45,0.5)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{ color: '#D9A02D', fontSize: Math.round(size * 0.115), fontWeight: 700, lineHeight: 1, display: 'flex' }}>★</div>
        <div style={{ color: '#D9A02D', fontSize: Math.round(size * 0.082), fontWeight: 600, letterSpacing: 1.5, lineHeight: 1.4, display: 'flex' }}>MADE IN</div>
        <div style={{ color: '#D9A02D', fontSize: Math.round(size * 0.192), fontWeight: 700, letterSpacing: 0.5, lineHeight: 1.1, display: 'flex' }}>NAIJA</div>
        <div style={{ color: '#D9A02D', fontSize: Math.round(size * 0.058), fontWeight: 600, letterSpacing: 1.5, lineHeight: 1.4, display: 'flex' }}>VERIFIED ORIGIN</div>
      </div>
    </div>
  );
}

function IBuyNaijaBrand({ fontSize = 22 }: { fontSize?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <div style={{ color: '#F7F1E3', fontSize, fontWeight: 700, display: 'flex' }}>iBuy</div>
      <div style={{ color: '#D9A02D', fontSize, fontWeight: 700, display: 'flex' }}>Naija</div>
    </div>
  );
}

function StarRating({ avg, count }: { avg: number; count: number }) {
  const display = avg.toFixed(1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ color: '#D9A02D', fontSize: 28, lineHeight: 1, display: 'flex' }}>★</div>
      <div style={{ color: '#F7F1E3', fontSize: 32, fontWeight: 700, display: 'flex' }}>{display}</div>
      <div style={{ color: 'rgba(247,241,227,0.45)', fontSize: 18, display: 'flex' }}>
        / 5 · {count} review{count !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

/* ── Seller initials avatar ──────────────────────────────────────────────── */

function Avatar({ businessName, logoUrl, size }: { businessName: string; logoUrl: string | null; size: number }) {
  const initials = businessName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (logoUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', display: 'flex', flexShrink: 0 }}>
        <img src={logoUrl} width={size} height={size} style={{ objectFit: 'cover' }} />
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(217,160,45,0.15)',
      border: '2px solid rgba(217,160,45,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{ color: '#D9A02D', fontSize: Math.round(size * 0.38), fontWeight: 700, display: 'flex' }}>
        {initials}
      </div>
    </div>
  );
}

/* ── Square card (1080 × 1080) ───────────────────────────────────────────── */

function SquareSellerCard({
  businessName, tagline, cityArea, state, verifiedStatus, logoUrl,
  soldCount, avgExperience, avgQuality, ratingCount,
}: SellerCardProps) {
  const avgRating = ratingCount > 0 ? (avgExperience + avgQuality) / 2 : 0;

  return (
    <div style={{
      width: 1080, height: 1080, display: 'flex', flexDirection: 'column',
      fontFamily: 'Noto Sans, Noto Symbols, sans-serif',
      background: 'linear-gradient(150deg, #1B2A4A 0%, #233659 50%, #2C426B 100%)',
      padding: '60px 72px',
      justifyContent: 'space-between',
    }}>
      {/* TOP: seal + verified */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <NaijaSeal size={108} />
        {verifiedStatus && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#D9A02D', color: '#1B2A4A',
            fontSize: 14, fontWeight: 700,
            padding: '8px 18px', borderRadius: 7, letterSpacing: 0.5,
          }}>
            <span>✓</span><span> VERIFIED SELLER</span>
          </div>
        )}
      </div>

      {/* MIDDLE: seller identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28 }}>
          <Avatar businessName={businessName} logoUrl={logoUrl} size={96} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#F7F1E3', fontSize: 42, fontWeight: 700, lineHeight: 1.15, display: 'flex' }}>
              {businessName.length > 28 ? businessName.slice(0, 25) + '…' : businessName}
            </div>
            <div style={{ color: 'rgba(247,241,227,0.4)', fontSize: 18, marginTop: 6, display: 'flex' }}>
              {cityArea}, {state}
            </div>
          </div>
        </div>

        {tagline && (
          <div style={{
            color: 'rgba(247,241,227,0.7)', fontSize: 22,
            fontWeight: 600, lineHeight: 1.5,
            borderLeft: '3px solid #D9A02D',
            paddingLeft: 20, display: 'flex',
          }}>
            {tagline.length > 80 ? tagline.slice(0, 77) + '…' : tagline}
          </div>
        )}
      </div>

      {/* STATS */}
      <div style={{ display: 'flex', gap: 0 }}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: 'rgba(247,241,227,0.06)',
          borderRadius: 12, padding: '22px 28px',
          marginRight: 12,
        }}>
          <div style={{ color: 'rgba(247,241,227,0.5)', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, display: 'flex' }}>
            Orders Completed
          </div>
          <div style={{ color: '#F7F1E3', fontSize: 40, fontWeight: 700, lineHeight: 1, display: 'flex' }}>
            {soldCount}
          </div>
        </div>

        {ratingCount > 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            background: 'rgba(247,241,227,0.06)',
            borderRadius: 12, padding: '22px 28px',
          }}>
            <div style={{ color: 'rgba(247,241,227,0.5)', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, display: 'flex' }}>
              Avg Rating
            </div>
            <StarRating avg={avgRating} count={ratingCount} />
          </div>
        )}
      </div>

      {/* BOTTOM: brand */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 1, background: 'rgba(247,241,227,0.1)', marginBottom: 20, display: 'flex' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IBuyNaijaBrand fontSize={24} />
          <div style={{ color: 'rgba(247,241,227,0.28)', fontSize: 14, display: 'flex' }}>
            ibuynaija.com
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Vertical card (1080 × 1920) ─────────────────────────────────────────── */

function VerticalSellerCard({
  businessName, tagline, cityArea, state, verifiedStatus, logoUrl,
  soldCount, avgExperience, avgQuality, ratingCount,
}: SellerCardProps) {
  const avgRating = ratingCount > 0 ? (avgExperience + avgQuality) / 2 : 0;

  return (
    <div style={{
      width: 1080, height: 1920, display: 'flex', flexDirection: 'column',
      fontFamily: 'Noto Sans, Noto Symbols, sans-serif',
      background: 'linear-gradient(170deg, #1B2A4A 0%, #233659 40%, #2C426B 70%, #1B2A4A 100%)',
      padding: '80px 88px',
      justifyContent: 'space-between',
    }}>
      {/* TOP: seal */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <NaijaSeal size={176} />
        {verifiedStatus && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#D9A02D', color: '#1B2A4A',
            fontSize: 16, fontWeight: 700,
            padding: '10px 22px', borderRadius: 8, letterSpacing: 0.5,
            marginTop: 28,
          }}>
            <span>✓</span><span> VERIFIED SELLER</span>
          </div>
        )}
      </div>

      {/* MIDDLE: identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar businessName={businessName} logoUrl={logoUrl} size={128} />
        <div style={{ color: '#F7F1E3', fontSize: 52, fontWeight: 700, lineHeight: 1.15, marginTop: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {businessName.length > 24 ? businessName.slice(0, 21) + '…' : businessName}
        </div>
        <div style={{ color: 'rgba(247,241,227,0.4)', fontSize: 22, marginTop: 8, display: 'flex' }}>
          {cityArea}, {state}
        </div>

        {tagline && (
          <div style={{
            color: 'rgba(247,241,227,0.7)', fontSize: 26,
            fontWeight: 600, lineHeight: 1.55,
            textAlign: 'center', marginTop: 36, display: 'flex',
            paddingLeft: 8, paddingRight: 8,
          }}>
            {tagline.length > 90 ? tagline.slice(0, 87) + '…' : tagline}
          </div>
        )}
      </div>

      {/* STATS */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: 'rgba(247,241,227,0.06)',
          borderRadius: 16, padding: '28px 32px',
        }}>
          <div style={{ color: 'rgba(247,241,227,0.5)', fontSize: 14, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, display: 'flex' }}>
            Orders
          </div>
          <div style={{ color: '#F7F1E3', fontSize: 52, fontWeight: 700, lineHeight: 1, display: 'flex' }}>
            {soldCount}
          </div>
        </div>

        {ratingCount > 0 && (
          <div style={{
            flex: 1.5, display: 'flex', flexDirection: 'column',
            background: 'rgba(247,241,227,0.06)',
            borderRadius: 16, padding: '28px 32px',
          }}>
            <div style={{ color: 'rgba(247,241,227,0.5)', fontSize: 14, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, display: 'flex' }}>
              Rating
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ color: '#D9A02D', fontSize: 36, lineHeight: 1, display: 'flex' }}>★</div>
              <div style={{ color: '#F7F1E3', fontSize: 44, fontWeight: 700, display: 'flex' }}>{avgRating.toFixed(1)}</div>
              <div style={{ color: 'rgba(247,241,227,0.4)', fontSize: 22, display: 'flex' }}>/ 5</div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM: brand */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ height: 1, background: 'rgba(247,241,227,0.1)', marginBottom: 28, display: 'flex', width: '100%' }} />
        <IBuyNaijaBrand fontSize={32} />
        <div style={{ color: 'rgba(247,241,227,0.28)', fontSize: 18, marginTop: 6, display: 'flex' }}>
          ibuynaija.com · Made in Nigeria marketplace
        </div>
      </div>
    </div>
  );
}

/* ── Shared props type ───────────────────────────────────────────────────── */

interface SellerCardProps {
  businessName: string;
  tagline: string | null;
  cityArea: string;
  state: string;
  verifiedStatus: boolean;
  logoUrl: string | null;
  soldCount: number;
  avgExperience: number;
  avgQuality: number;
  ratingCount: number;
}

/* ── Route handler ───────────────────────────────────────────────────────── */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const format = request.nextUrl.searchParams.get('format') ?? 'square';
  const isVertical = format === 'vertical';

  const [seller, notoFont, symbolsFont] = await Promise.all([
    getSellerForShare(slug),
    getNotoFont(),
    getSymbolsFont(),
  ]);

  if (!seller) {
    return new Response('Seller not found', { status: 404 });
  }

  const fonts = [
    ...(notoFont ? [{ name: 'Noto Sans', data: notoFont, weight: 700 as const, style: 'normal' as const }] : []),
    ...(symbolsFont ? [{ name: 'Noto Symbols', data: symbolsFont, weight: 400 as const, style: 'normal' as const }] : []),
  ];

  const cardProps: SellerCardProps = {
    businessName: seller.business_name,
    tagline: seller.tagline ?? null,
    cityArea: seller.city_area,
    state: seller.state,
    verifiedStatus: seller.verified_status,
    logoUrl: seller.logo_photo_url ?? null,
    soldCount: seller.sold_count,
    avgExperience: parseFloat(seller.avg_experience) || 0,
    avgQuality: parseFloat(seller.avg_quality) || 0,
    ratingCount: seller.rating_count,
  };

  return new ImageResponse(
    isVertical ? <VerticalSellerCard {...cardProps} /> : <SquareSellerCard {...cardProps} />,
    { width: 1080, height: isVertical ? 1920 : 1080, fonts },
  );
}
