import Link from 'next/link';
import Navbar from '@/components/Navbar';

export const metadata = { title: 'Page not found | iBuyNaija' };

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏺</div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 32, color: '#1B2A4A', margin: '0 0 12px' }}>
            Page not found
          </h1>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 16, color: '#8A7E66', lineHeight: 1.6, margin: '0 0 32px' }}>
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15,
                background: '#1B2A4A', color: '#F7F1E3',
                padding: '12px 28px', borderRadius: 10, textDecoration: 'none',
              }}
            >
              Back to home
            </Link>
            <Link
              href="/products"
              style={{
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15,
                background: 'transparent', color: '#1B2A4A',
                border: '1px solid rgba(27,42,74,0.2)',
                padding: '12px 28px', borderRadius: 10, textDecoration: 'none',
              }}
            >
              Browse listings
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
