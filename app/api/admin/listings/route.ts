import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT
       lr.id AS report_id, lr.reason, lr.details, lr.resolved, lr.date_created AS reported_at,
       l.id AS listing_id, l.title, l.status AS listing_status,
       s.id AS seller_id, s.business_name
     FROM listing_reports lr
     JOIN listings l ON l.id = lr.listing_id
     JOIN sellers s ON s.id = l.seller_id
     WHERE lr.resolved = false
     ORDER BY lr.date_created ASC`,
  );

  return NextResponse.json({ reports: rows });
}
