/**
 * GET  /api/seller-applications  — buyer fetches their own application status
 * POST /api/seller-applications  — buyer submits (or re-submits) an application
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';
import { BUYER_COOKIE } from '@/lib/cookie';
import { NIGERIAN_STATES } from '@/lib/nigerian-states';
import { emailAdminNewSellerApplication } from '@/lib/email';

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export async function GET() {
  const store  = await cookies();
  const userId = store.get(BUYER_COOKIE)?.value ?? null;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT id, business_name, status, rejection_reason, date_applied, date_decided
     FROM seller_applications WHERE user_id = $1`,
    [userId],
  );
  return NextResponse.json(rows[0] ?? null);
}

export async function POST(request: Request) {
  const store  = await cookies();
  const userId = store.get(BUYER_COOKIE)?.value ?? null;
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Guard: user must not already have a sellers record
  const { rows: existing } = await pool.query(
    'SELECT id FROM sellers WHERE user_id = $1',
    [userId],
  );
  if (existing.length > 0)
    return NextResponse.json({ error: 'You already have a seller account' }, { status: 409 });

  // Guard: no currently-pending application
  const { rows: existingApp } = await pool.query(
    `SELECT status FROM seller_applications WHERE user_id = $1`,
    [userId],
  );
  if (existingApp.length > 0 && existingApp[0].status === 'pending')
    return NextResponse.json({ error: 'You already have a pending application' }, { status: 409 });

  let body: {
    business_name?: string;
    slug?: string;
    state?: string;
    city_area?: string;
    provider_type?: string;
    bank_account_name?: string;
    bank_account_number?: string;
    bank_name?: string;
    cac_certificate_url?: string;
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    business_name,
    slug: rawSlug,
    state,
    city_area,
    provider_type = 'seller',
    bank_account_name,
    bank_account_number,
    bank_name,
    cac_certificate_url,
  } = body;

  if (!business_name?.trim())
    return NextResponse.json({ error: 'Business / Registered Name is required' }, { status: 400 });
  if (!state || !(NIGERIAN_STATES as readonly string[]).includes(state))
    return NextResponse.json({ error: 'Please select a valid Nigerian state' }, { status: 400 });
  if (!city_area?.trim())
    return NextResponse.json({ error: 'City / Area is required' }, { status: 400 });
  if (!['seller', 'provider', 'both'].includes(provider_type))
    return NextResponse.json({ error: 'Invalid account type' }, { status: 400 });

  const slug = rawSlug?.trim() ? toSlug(rawSlug.trim()) : toSlug(business_name.trim());
  if (!slug)
    return NextResponse.json(
      { error: 'Could not generate a valid shop URL from your business name. Please edit it manually.' },
      { status: 400 },
    );

  // Check slug uniqueness against active sellers AND other pending applications
  const { rows: slugCheck } = await pool.query(
    `SELECT 1 FROM sellers WHERE slug = $1
     UNION ALL
     SELECT 1 FROM seller_applications WHERE slug = $1 AND status = 'pending' AND user_id != $2`,
    [slug, userId],
  );
  if (slugCheck.length > 0)
    return NextResponse.json(
      { error: 'This shop URL is already taken. Please choose another.' },
      { status: 409 },
    );

  // Upsert so a rejected applicant can re-apply without hitting the unique constraint
  const { rows: [app] } = await pool.query(
    `INSERT INTO seller_applications
       (user_id, business_name, slug, state, city_area, provider_type,
        bank_account_name, bank_account_number, bank_name, cac_certificate_url,
        status, date_applied)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET business_name        = EXCLUDED.business_name,
           slug                 = EXCLUDED.slug,
           state                = EXCLUDED.state,
           city_area            = EXCLUDED.city_area,
           provider_type        = EXCLUDED.provider_type,
           bank_account_name    = EXCLUDED.bank_account_name,
           bank_account_number  = EXCLUDED.bank_account_number,
           bank_name            = EXCLUDED.bank_name,
           cac_certificate_url  = EXCLUDED.cac_certificate_url,
           status               = 'pending',
           rejection_reason     = NULL,
           date_applied         = NOW(),
           date_decided         = NULL,
           decided_by           = NULL
     RETURNING id, status`,
    [
      userId,
      business_name.trim(),
      slug,
      state,
      city_area.trim(),
      provider_type,
      bank_account_name?.trim()   || null,
      bank_account_number?.trim() || null,
      bank_name?.trim()           || null,
      cac_certificate_url?.trim() || null,
    ],
  );

  pool.query('SELECT email FROM users WHERE id = $1', [userId])
    .then(({ rows }) => {
      if (rows.length === 0 || !rows[0].email) return;
      emailAdminNewSellerApplication({
        businessName: business_name.trim(),
        ownerEmail: rows[0].email,
        state,
        cityArea: city_area.trim(),
      }).catch((err) => console.error('[email] admin new-application notify:', err));
    })
    .catch((err) => console.error('[email] admin new-application lookup:', err));

  return NextResponse.json(app, { status: 201 });
}
