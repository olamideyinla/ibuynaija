/**
 * PATCH /api/seller/profile
 *
 * Full profile update for the authenticated seller.
 * The edit form always sends every field, so we do a straight replace.
 * Slug changes are excluded — those need slug-history tracking.
 * business_name is excluded — see POST /api/seller/name-change; it requires
 * admin approval before taking effect.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import { NIGERIAN_STATES } from '@/lib/nigerian-states';

export async function PATCH(request: Request) {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: {
    tagline?:             string;
    description?:         string;
    state?:               string;
    city_area?:           string;
    bank_account_name?:   string;
    bank_account_number?: string;
    bank_name?:           string;
    whatsapp_number?:     string;
    delivery_zones?:      Record<string, number>;
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const state = body.state ?? '';
  if (!(NIGERIAN_STATES as readonly string[]).includes(state)) {
    return NextResponse.json({ error: 'Please select a valid Nigerian state' }, { status: 400 });
  }

  const city_area = body.city_area?.trim() ?? '';
  if (!city_area) {
    return NextResponse.json({ error: 'City / Area cannot be empty' }, { status: 400 });
  }

  // Optional text fields: empty string → NULL
  const orNull = (v: string | undefined) => v?.trim() || null;

  // Normalise WhatsApp number to E.164 if provided
  function normaliseWhatsApp(raw: string | undefined): string | null {
    if (!raw?.trim()) return null;
    const digits = raw.trim().replace(/\D/g, '');
    if (digits.startsWith('234') && digits.length >= 13) return '+' + digits;
    if (digits.startsWith('0') && digits.length === 11) return '+234' + digits.slice(1);
    if (digits.length >= 10) return '+' + digits; // accept other formats verbatim
    return raw.trim();
  }

  // Validate delivery_zones: must be a plain object with non-negative number values
  const rawZones = body.delivery_zones;
  let delivery_zones: Record<string, number> = {};
  if (rawZones !== undefined) {
    if (typeof rawZones !== 'object' || Array.isArray(rawZones)) {
      return NextResponse.json({ error: 'delivery_zones must be an object' }, { status: 400 });
    }
    for (const [k, v] of Object.entries(rawZones)) {
      if (typeof v !== 'number' || v < 0) {
        return NextResponse.json({ error: `Delivery fee for "${k}" must be a non-negative number` }, { status: 400 });
      }
    }
    delivery_zones = rawZones;
  }

  await pool.query(
    `UPDATE sellers SET
       tagline             = $1,
       description         = $2,
       state               = $3,
       city_area           = $4,
       bank_account_name   = $5,
       bank_account_number = $6,
       bank_name           = $7,
       whatsapp_number     = $8,
       delivery_zones      = $9::jsonb
     WHERE id = $10`,
    [
      orNull(body.tagline),
      orNull(body.description),
      state,
      city_area,
      orNull(body.bank_account_name),
      orNull(body.bank_account_number),
      orNull(body.bank_name),
      normaliseWhatsApp(body.whatsapp_number),
      JSON.stringify(delivery_zones),
      sellerId,
    ],
  );

  return NextResponse.json({ ok: true });
}
