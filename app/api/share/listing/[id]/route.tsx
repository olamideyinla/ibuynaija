import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import pool from '@/lib/db';
import { formatNaira } from '@/lib/format';

/* ── Fonts ───────────────────────────────────────────────────────────────── */
// Two tiny subsets loaded in parallel:
//   1. Noto Sans Bold   (~14 KB) — Latin text + ₦ (U+20A6)
//   2. Noto Sans Symbols 2 (~6 KB) — ★ (U+2605) + ✓ (U+2713)
// Satori automatically falls back to the symbols font when a glyph is absent
// from the primary font.

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

async function getListingForShare(id: string) {
  const { rows } = await pool.query(
    `SELECT l.title, l.price, l.photos, l.cover_photo_index, l.status,
            c.name AS category_name,
            s.business_name, s.city_area, s.state, s.verified_status
     FROM listings l
     JOIN sellers    s ON s.id = l.seller_id
     JOIN categories c ON c.id = l.category_id
     WHERE l.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/* ── Sub-components (evaluated by Satori) ────────────────────────────────── */

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

function VerifiedPill() {
  return (
    <div style={{
      background: '#D9A02D', color: '#1B2A4A',
      fontSize: 13, fontWeight: 700,
      padding: '6px 14px', borderRadius: 6, letterSpacing: 0.5,
      display: 'flex', alignItems: 'center', gap: 5,
    }}>
      <span>✓</span><span> VERIFIED SELLER</span>
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

/* ── Square layout (1080 × 1080) ────────────────────────────────────────── */

function SquareCard({
  title, price, photoUrl, categoryName, businessName, cityArea, state, verifiedStatus,
}: {
  title: string; price: string | null; photoUrl: string | null;
  categoryName: string; businessName: string; cityArea: string; state: string;
  verifiedStatus: boolean;
}) {
  return (
    <div style={{ width: 1080, height: 1080, display: 'flex', fontFamily: 'Noto Sans, Noto Symbols, sans-serif' }}>
      {/* Left: photo */}
      <div style={{ width: 540, height: 1080, display: 'flex', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        {photoUrl ? (
          <img src={photoUrl} width={540} height={1080} style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: 540, height: 1080, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(150deg, #2C426B 0%, #1B2A4A 100%)',
            flexDirection: 'column', gap: 16,
          }}>
            <NaijaSeal size={160} />
          </div>
        )}
        {/* Vignette overlay */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          background: 'linear-gradient(to right, transparent 70%, rgba(27,42,74,0.25) 100%)',
        }} />
      </div>

      {/* Right: info panel */}
      <div style={{
        flex: 1, background: '#1B2A4A',
        display: 'flex', flexDirection: 'column',
        padding: '52px 48px',
        justifyContent: 'space-between',
      }}>
        {/* TOP */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Seal + verified */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
            <NaijaSeal size={96} />
            {verifiedStatus && <VerifiedPill />}
          </div>

          {/* Category */}
          <div style={{
            color: '#D9A02D', fontSize: 12, fontWeight: 700,
            letterSpacing: 2.5, textTransform: 'uppercase',
            marginBottom: 14, display: 'flex',
          }}>
            {categoryName}
          </div>

          {/* Title */}
          <div style={{
            color: '#F7F1E3', fontSize: 34, fontWeight: 700,
            lineHeight: 1.2, marginBottom: 28, display: 'flex',
          }}>
            {title.length > 52 ? title.slice(0, 49) + '…' : title}
          </div>

          {/* Price */}
          {price ? (
            <div style={{ color: '#D9A02D', fontSize: 52, fontWeight: 700, lineHeight: 1, display: 'flex' }}>
              {price}
            </div>
          ) : (
            <div style={{ color: 'rgba(247,241,227,0.45)', fontSize: 20, fontWeight: 600, display: 'flex' }}>
              Price on request
            </div>
          )}
        </div>

        {/* BOTTOM */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 1, background: 'rgba(247,241,227,0.12)', marginBottom: 22, display: 'flex' }} />
          <div style={{ color: 'rgba(247,241,227,0.75)', fontSize: 16, fontWeight: 600, marginBottom: 4, display: 'flex' }}>
            {businessName}
          </div>
          <div style={{ color: 'rgba(247,241,227,0.38)', fontSize: 14, marginBottom: 22, display: 'flex' }}>
            {cityArea}, {state}
          </div>
          <IBuyNaijaBrand fontSize={21} />
          <div style={{ color: 'rgba(247,241,227,0.28)', fontSize: 12, marginTop: 2, display: 'flex' }}>
            ibuynaija.com
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Vertical layout (1080 × 1920) ─────────────────────────────────────── */

function VerticalCard({
  title, price, photoUrl, categoryName, businessName, cityArea, state, verifiedStatus,
}: {
  title: string; price: string | null; photoUrl: string | null;
  categoryName: string; businessName: string; cityArea: string; state: string;
  verifiedStatus: boolean;
}) {
  return (
    <div style={{ width: 1080, height: 1920, display: 'flex', flexDirection: 'column', fontFamily: 'Noto Sans, Noto Symbols, sans-serif' }}>
      {/* Photo section */}
      <div style={{ width: 1080, height: 1080, display: 'flex', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        {photoUrl ? (
          <img src={photoUrl} width={1080} height={1080} style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: 1080, height: 1080, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(150deg, #2C426B 0%, #1B2A4A 100%)',
          }}>
            <NaijaSeal size={260} />
          </div>
        )}
        {/* Vignette bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 300,
          background: 'linear-gradient(to top, #1B2A4A, transparent)',
          display: 'flex',
        }} />
        {/* Verified badge top-left */}
        {verifiedStatus && (
          <div style={{ position: 'absolute', top: 40, left: 40, display: 'flex' }}>
            <VerifiedPill />
          </div>
        )}
      </div>

      {/* Info panel */}
      <div style={{
        flex: 1, background: '#1B2A4A',
        display: 'flex', flexDirection: 'column',
        padding: '40px 64px 60px',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Seal + category row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
            <NaijaSeal size={108} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                color: '#D9A02D', fontSize: 14, fontWeight: 700,
                letterSpacing: 2.5, textTransform: 'uppercase',
                display: 'flex',
              }}>
                {categoryName}
              </div>
            </div>
          </div>

          {/* Title */}
          <div style={{
            color: '#F7F1E3', fontSize: 48, fontWeight: 700,
            lineHeight: 1.15, marginBottom: 32, display: 'flex',
          }}>
            {title.length > 70 ? title.slice(0, 67) + '…' : title}
          </div>

          {/* Price */}
          {price ? (
            <div style={{ color: '#D9A02D', fontSize: 68, fontWeight: 700, lineHeight: 1, display: 'flex' }}>
              {price}
            </div>
          ) : (
            <div style={{ color: 'rgba(247,241,227,0.45)', fontSize: 26, fontWeight: 600, display: 'flex' }}>
              Price on request
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 1, background: 'rgba(247,241,227,0.12)', marginBottom: 28, display: 'flex' }} />
          <div style={{ color: 'rgba(247,241,227,0.8)', fontSize: 22, fontWeight: 600, marginBottom: 6, display: 'flex' }}>
            {businessName}
          </div>
          <div style={{ color: 'rgba(247,241,227,0.4)', fontSize: 18, marginBottom: 32, display: 'flex' }}>
            {cityArea}, {state}
          </div>
          <IBuyNaijaBrand fontSize={28} />
          <div style={{ color: 'rgba(247,241,227,0.28)', fontSize: 16, marginTop: 4, display: 'flex' }}>
            ibuynaija.com
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Route handler ───────────────────────────────────────────────────────── */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get('format') ?? 'square';
  const isVertical = format === 'vertical';

  const [listing, notoFont, symbolsFont] = await Promise.all([
    getListingForShare(id),
    getNotoFont(),
    getSymbolsFont(),
  ]);

  if (!listing) {
    return new Response('Listing not found', { status: 404 });
  }

  const price = formatNaira(listing.price);
  const coverIdx: number = Number(listing.cover_photo_index) || 0;
  const photoUrl: string | null = Array.isArray(listing.photos) && listing.photos.length > 0
    ? (listing.photos[coverIdx] ?? listing.photos[0])
    : null;

  const fonts = [
    ...(notoFont ? [{ name: 'Noto Sans', data: notoFont, weight: 700 as const, style: 'normal' as const }] : []),
    ...(symbolsFont ? [{ name: 'Noto Symbols', data: symbolsFont, weight: 400 as const, style: 'normal' as const }] : []),
  ];

  const cardProps = {
    title: listing.title,
    price,
    photoUrl,
    categoryName: listing.category_name,
    businessName: listing.business_name,
    cityArea: listing.city_area,
    state: listing.state,
    verifiedStatus: listing.verified_status,
  };

  return new ImageResponse(
    isVertical ? <VerticalCard {...cardProps} /> : <SquareCard {...cardProps} />,
    { width: 1080, height: isVertical ? 1920 : 1080, fonts },
  );
}
