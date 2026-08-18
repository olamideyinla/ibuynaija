import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';

interface Params { params: Promise<{ reportId: string }> }

export async function POST(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reportId } = await params;

  let body: { action?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action } = body;
  if (!['resolve', 'remove_listing'].includes(action ?? '')) {
    return NextResponse.json({ error: 'action must be resolve or remove_listing' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `SELECT lr.id, lr.listing_id, lr.resolved FROM listing_reports lr WHERE lr.id = $1`,
    [reportId],
  );
  if (rows.length === 0) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  if (rows[0].resolved) return NextResponse.json({ error: 'Report already resolved' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (action === 'remove_listing') {
      await client.query(
        `UPDATE listings SET status = 'removed' WHERE id = $1`,
        [rows[0].listing_id],
      );
    }

    await client.query(
      `UPDATE listing_reports SET resolved = true WHERE id = $1`,
      [reportId],
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true, action });
}
