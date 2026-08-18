/**
 * POST /api/upload
 *
 * Returns a short-lived Cloudinary signed-upload signature so the client can
 * upload an image directly to Cloudinary without routing through Next.js.
 *
 * Flow:
 *   1. Client POSTs { folder } here.
 *   2. Server signs the upload params and returns { signature, timestamp,
 *      api_key, cloud_name, folder }.
 *   3. Client POSTs the file + those params straight to Cloudinary's upload API.
 *   4. Cloudinary returns { secure_url } which the client stores in form state.
 *
 * The folder param is restricted to known safe prefixes so the signature
 * cannot be reused to upload to arbitrary folders.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { SELLER_COOKIE, BUYER_COOKIE } from '@/lib/cookie';

const ALLOWED_PREFIXES = ['ibuynaija/listings', 'ibuynaija/sellers', 'ibuynaija/services', 'ibuynaija/receipts', 'ibuynaija/documents'];

export async function POST(request: Request) {
  // Must be authenticated (any user type)
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value;
  const buyerId  = store.get(BUYER_COOKIE)?.value;
  if (!sellerId && !buyerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('[upload] Cloudinary env vars not set');
    return NextResponse.json({ error: 'Image upload is not configured' }, { status: 503 });
  }

  let body: { folder?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const folder = (body.folder ?? 'ibuynaija/listings').trim();
  if (!ALLOWED_PREFIXES.some(p => folder === p || folder.startsWith(p + '/'))) {
    return NextResponse.json({ error: 'Invalid upload folder' }, { status: 400 });
  }

  const timestamp = Math.round(Date.now() / 1000);

  // Cloudinary signature: sort params alphabetically, join with &=, append secret, SHA-1
  const params: Record<string, string | number> = { folder, timestamp };
  const signStr = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&') + apiSecret;

  const signature = createHash('sha1').update(signStr).digest('hex');

  return NextResponse.json({ signature, timestamp, folder, api_key: apiKey, cloud_name: cloudName });
}
