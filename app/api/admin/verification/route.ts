import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAdminSession } from '@/lib/admin-auth';

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT
       s.id, s.business_name, s.state, s.city_area,
       s.verified_status, s.verification_requested, s.verified_date,
       u.email AS owner_email, u.phone AS owner_phone,
       COUNT(DISTINCT l.id) AS listing_count,
       COUNT(DISTINCT vn.id) AS note_count
     FROM sellers s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN listings l ON l.seller_id = s.id
     LEFT JOIN verification_notes vn ON vn.seller_id = s.id
     WHERE s.verification_requested = true OR s.verified_status = true
     GROUP BY s.id, s.business_name, s.state, s.city_area,
              s.verified_status, s.verification_requested, s.verified_date,
              u.email, u.phone
     ORDER BY
       CASE WHEN s.verification_requested AND NOT s.verified_status THEN 0 ELSE 1 END,
       s.verified_date DESC NULLS LAST`,
  );

  return NextResponse.json({ sellers: rows });
}
