/**
 * PATCH /api/admin/listing-category/[listingId]
 * Admin-only: correct a listing's category_id.
 */

import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { pool } from '@/lib/db';

interface Params { params: Promise<{ listingId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { listingId } = await params;

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { category_id } = body;
  if (!category_id || typeof category_id !== 'string') {
    return NextResponse.json({ error: 'category_id is required' }, { status: 400 });
  }

  // Confirm category exists and belongs to marketplace
  const { rows: [cat] } = await pool.query(
    `SELECT id FROM categories WHERE id = $1 AND section = 'marketplace'`,
    [category_id],
  );
  if (!cat) {
    return NextResponse.json({ error: 'Category not found or not a marketplace category' }, { status: 400 });
  }

  const { rowCount } = await pool.query(
    `UPDATE listings SET category_id = $1, date_updated = NOW() WHERE id = $2`,
    [category_id, listingId],
  );
  if (rowCount === 0) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
