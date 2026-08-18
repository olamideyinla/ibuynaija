/**
 * GET /api/admin/seller-applications — list all applications (admin only)
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT
       sa.id, sa.business_name, sa.state, sa.city_area, sa.provider_type,
       sa.status, sa.rejection_reason, sa.date_applied, sa.date_decided,
       u.email AS owner_email, u.phone AS owner_phone, u.full_name AS owner_name
     FROM seller_applications sa
     JOIN users u ON u.id = sa.user_id
     ORDER BY
       CASE sa.status
         WHEN 'pending'  THEN 0
         WHEN 'rejected' THEN 1
         ELSE 2
       END,
       sa.date_applied DESC`,
  );

  return NextResponse.json(rows);
}
