import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import ServiceForm from '../ServiceForm';

export const metadata = { title: 'New Service — Dashboard | iBuyNaija' };

export default async function NewServicePage() {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { rows: catRows } = await pool.query(
    `SELECT id, name FROM categories ORDER BY name`,
  );

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>
        <Link
          href="/dashboard/services"
          style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}
        >
          ← My Services
        </Link>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 28px' }}>
          New Service
        </h1>
        <ServiceForm categories={catRows} />
      </main>
    </>
  );
}
