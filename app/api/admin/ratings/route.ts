import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT
       rr.id AS report_id, rr.reason, rr.resolved, rr.date_created AS reported_at,
       r.id AS rating_id, r.buying_experience_score, r.product_quality_score, r.comment, r.reported AS rating_flagged,
       l.id AS listing_id, l.title AS listing_title,
       s.id AS seller_id, s.business_name
     FROM rating_reports rr
     JOIN ratings r ON r.id = rr.rating_id
     JOIN listings l ON l.id = r.listing_id
     JOIN sellers s ON s.id = l.seller_id
     WHERE rr.resolved = false
     ORDER BY rr.date_created ASC`,
  );

  return NextResponse.json({ reports: rows });
}
