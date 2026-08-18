import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';

interface Params { params: Promise<{ sellerId: string }> }

export async function GET(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sellerId } = await params;

  const { rows } = await pool.query(
    `SELECT vn.id, vn.text, vn.date_created, au.email AS admin_email
     FROM verification_notes vn
     JOIN admin_users au ON au.id = vn.admin_id
     WHERE vn.seller_id = $1
     ORDER BY vn.date_created DESC`,
    [sellerId],
  );

  return NextResponse.json({ notes: rows });
}

export async function POST(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sellerId } = await params;

  let body: { text?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

  const { rows } = await pool.query(
    `INSERT INTO verification_notes (seller_id, admin_id, text)
     VALUES ($1, $2, $3)
     RETURNING id, text, date_created`,
    [sellerId, session.id, text],
  );

  return NextResponse.json({ note: rows[0] }, { status: 201 });
}
