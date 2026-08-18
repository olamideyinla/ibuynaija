/**
 * GET  /api/admin/seller-applications/[id]  — fetch application detail
 * POST /api/admin/seller-applications/[id]  — approve or reject application
 *   On approve: creates the sellers record and marks the user as is_seller.
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';
import { emailSellerApplicationApproved } from '@/lib/email';

interface Params { params: Promise<{ id: string }> }

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { rows } = await pool.query(
    `SELECT
       sa.id, sa.business_name, sa.slug, sa.state, sa.city_area, sa.provider_type,
       sa.bank_account_name, sa.bank_account_number, sa.bank_name,
       sa.status, sa.rejection_reason, sa.date_applied,
       u.id AS user_id, u.email AS owner_email, u.phone AS owner_phone,
       u.full_name AS owner_name, u.date_joined
     FROM seller_applications sa
     JOIN users u ON u.id = sa.user_id
     WHERE sa.id = $1`,
    [id],
  );

  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: { slug?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const slug = toSlug(body.slug?.trim() ?? '');
  if (!slug)
    return NextResponse.json({ error: 'Slug cannot be empty' }, { status: 400 });

  // Must still be pending
  const { rows: [app] } = await pool.query(
    'SELECT status FROM seller_applications WHERE id = $1',
    [id],
  );
  if (!app)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (app.status !== 'pending')
    return NextResponse.json({ error: 'Application is not pending' }, { status: 409 });

  // Uniqueness check against active sellers and other pending applications
  const { rows: conflict } = await pool.query(
    `SELECT 1 FROM sellers WHERE slug = $1
     UNION ALL
     SELECT 1 FROM seller_applications WHERE slug = $1 AND status = 'pending' AND id != $2`,
    [slug, id],
  );
  if (conflict.length > 0)
    return NextResponse.json({ error: 'This shop URL is already taken. Please choose another.' }, { status: 409 });

  await pool.query('UPDATE seller_applications SET slug = $1 WHERE id = $2', [slug, id]);
  return NextResponse.json({ ok: true, slug });
}

export async function POST(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: { action?: string; rejection_reason?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, rejection_reason } = body;
  if (!['approve', 'reject'].includes(action ?? ''))
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });

  // Fetch application + user
  const { rows: [app] } = await pool.query(
    `SELECT sa.*, u.id AS user_id, u.email AS owner_email, u.full_name AS owner_name
     FROM seller_applications sa
     JOIN users u ON u.id = sa.user_id
     WHERE sa.id = $1`,
    [id],
  );
  if (!app)
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  if (app.status !== 'pending')
    return NextResponse.json({ error: 'Application is not pending' }, { status: 409 });

  if (action === 'reject') {
    await pool.query(
      `UPDATE seller_applications
       SET status = 'rejected', rejection_reason = $2,
           date_decided = NOW(), decided_by = $3
       WHERE id = $1`,
      [id, rejection_reason?.trim() || null, session.id],
    );
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  // Approve: create sellers record (ensure slug uniqueness first)
  let slug = app.slug || toSlug(app.business_name);
  const { rows: slugCheck } = await pool.query(
    'SELECT 1 FROM sellers WHERE slug = $1',
    [slug],
  );
  if (slugCheck.length > 0) {
    slug = `${slug}-${Date.now()}`;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO sellers
         (user_id, slug, business_name, state, city_area, provider_type,
          bank_account_name, bank_account_number, bank_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        app.user_id,
        slug,
        app.business_name,
        app.state,
        app.city_area,
        app.provider_type,
        app.bank_account_name,
        app.bank_account_number,
        app.bank_name,
      ],
    );

    await client.query('UPDATE users SET is_seller = true WHERE id = $1', [app.user_id]);

    await client.query(
      `UPDATE seller_applications
       SET status = 'approved', date_decided = NOW(), decided_by = $2
       WHERE id = $1`,
      [id, session.id],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /api/admin/seller-applications/[id]]', err);
    return NextResponse.json({ error: 'Failed to approve application' }, { status: 500 });
  } finally {
    client.release();
  }

  if (app.owner_email) {
    emailSellerApplicationApproved({
      ownerEmail: app.owner_email,
      ownerName: app.owner_name,
      businessName: app.business_name,
      slug,
      state: app.state,
      cityArea: app.city_area,
      providerType: app.provider_type,
    }).catch((err) => console.error('[email] seller-application approved notify:', err));
  }

  return NextResponse.json({ ok: true, status: 'approved' });
}
