import Link from 'next/link';
import NaijaSeal from './ui/NaijaSeal';

const LINK: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 14,
  color: 'rgba(247,241,227,0.65)',
  textDecoration: 'none',
  lineHeight: '1.9',
  display: 'block',
};

const HEADING: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: 12,
  color: '#D9A02D',
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: 12,
};

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: '#1B2A4A', color: 'rgba(247,241,227,0.6)' }}>
      {/* Main footer grid */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px 32px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '40px 32px',
        }}>

          {/* Brand */}
          <div style={{ gridColumn: 'span 1' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 14 }}>
              <NaijaSeal size={28} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#F7F1E3' }}>
                iBuy<span style={{ color: '#D9A02D' }}>Naija</span>
              </span>
            </Link>
            <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: 'rgba(247,241,227,0.55)', lineHeight: 1.7, margin: 0, maxWidth: 220 }}>
              Every item made in Nigeria.<br />Bought with trust.
            </p>
          </div>

          {/* Shop */}
          <div>
            <div style={HEADING}>Shop</div>
            <Link href="/products" style={LINK}>All Products</Link>
            <Link href="/services" style={LINK}>Local Services</Link>
            <Link href="/search" style={LINK}>Search</Link>
          </div>

          {/* Company */}
          <div>
            <div style={HEADING}>Company</div>
            <Link href="/about" style={LINK}>About Us</Link>
            <Link href="/how-it-works" style={LINK}>How It Works</Link>
            <Link href="/register" style={LINK}>Start Selling</Link>
            <Link href="/dashboard" style={LINK}>Dashboard</Link>
          </div>

          {/* Legal */}
          <div>
            <div style={HEADING}>Legal & Info</div>
            <Link href="/privacy-policy" style={LINK}>Privacy Policy</Link>
            <Link href="/terms" style={LINK}>Terms &amp; Conditions</Link>
            <Link href="/cookie-policy" style={LINK}>Cookie Policy</Link>
            <Link href="/accessibility" style={LINK}>Accessibility</Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(247,241,227,0.08)' }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '16px 24px',
          display: 'flex', flexWrap: 'wrap', gap: 8,
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, color: 'rgba(247,241,227,0.4)', margin: 0 }}>
            © {year} iBuyNaija. All rights reserved.
          </p>
          <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, color: 'rgba(247,241,227,0.4)', margin: 0 }}>
            Prices in NGN · Payment is direct bank transfer between buyer and seller
          </p>
        </div>
      </div>
    </footer>
  );
}
