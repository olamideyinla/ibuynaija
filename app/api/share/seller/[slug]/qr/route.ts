/**
 * GET /api/share/seller/[slug]/qr
 *
 * Returns a print-ready QR code PNG (900 × 900 px) that points to the
 * seller's public profile page: https://ibuynaija.com/shop/<slug>
 *
 * Color: Adire indigo (#1B2A4A) on white — high contrast, brand-consistent.
 * Error correction: M (15 %) — standard; no logo overlay so M is sufficient.
 *
 * Usage (dashboard):
 *   <img src="/api/share/seller/adaeze-ankara/qr" />          ← inline preview
 *   <a href="..." download="ibuynaija-qr-adaeze-ankara.png">  ← download
 */

import { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import pool from '@/lib/db';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ibuynaija.com';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Verify the seller exists so we return 404 for unknown slugs
  const { rows } = await pool.query(
    'SELECT id FROM sellers WHERE slug = $1',
    [slug],
  );
  if (rows.length === 0) {
    return new Response('Seller not found', { status: 404 });
  }

  const profileUrl = `${APP_URL}/shop/${slug}`;

  const buffer = await QRCode.toBuffer(profileUrl, {
    type: 'png',
    width: 900,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: {
      dark:  '#1B2A4A', // Adire indigo — brand dark
      light: '#FFFFFF',
    },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type':  'image/png',
      // No Content-Disposition — let the dashboard anchor's `download` attr
      // control the filename; keeps the same URL usable for inline previews.
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
