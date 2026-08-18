import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import ProfileForm from './ProfileForm';

export const metadata = { title: 'Edit Profile | iBuyNaija' };

export default async function SellerProfilePage() {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { rows } = await pool.query(
    `SELECT business_name, tagline, description, state, city_area,
            bank_account_name, bank_account_number, bank_name,
            whatsapp_number, delivery_zones,
            pending_business_name, name_change_rejected_reason
     FROM sellers WHERE id = $1`,
    [sellerId],
  );
  if (rows.length === 0) redirect('/login');

  const s = rows[0];

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/dashboard"
            style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none' }}
          >
            ← Dashboard
          </Link>
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 6px' }}>
          Edit profile
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 32px' }}>
          Most changes are visible to buyers immediately. Business name changes require admin approval.
        </p>

        <ProfileForm seller={s} />
      </main>
    </>
  );
}
