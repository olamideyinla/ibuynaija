import Navbar from '@/components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | iBuyNaija',
  description: 'How iBuyNaija uses cookies and how you can manage them.',
};

const PROSE: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 15,
  color: '#3A3025',
  lineHeight: 1.8,
};

const H2: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: 20,
  color: '#1B2A4A',
  margin: '40px 0 12px',
};

const TABLE_CELL: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 14,
  color: '#3A3025',
  padding: '12px 16px',
  borderBottom: '1px solid rgba(27,42,74,0.08)',
  verticalAlign: 'top',
};

export default function CookiePolicyPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>

        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: '#C1542C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 36, color: '#1B2A4A', margin: '0 0 12px' }}>
            Cookie Policy
          </h1>
          <p style={{ ...PROSE, color: '#8A7E66' }}>
            Last updated: July 2026 &nbsp;·&nbsp; Effective date: 1 January 2025
          </p>
        </div>

        <p style={PROSE}>
          This Cookie Policy explains what cookies are, which cookies iBuyNaija uses, why we use them, and how you can control them. This policy should be read alongside our <a href="/privacy-policy" style={{ color: '#C1542C' }}>Privacy Policy</a>.
        </p>

        <h2 style={H2}>1. What Are Cookies?</h2>
        <p style={PROSE}>
          Cookies are small text files stored by your web browser when you visit a website. They are widely used to make websites work, remember your preferences, and provide information to site owners.
        </p>
        <p style={PROSE}>
          Cookies can be <strong>first-party</strong> (set by the website you are visiting) or <strong>third-party</strong> (set by another service embedded in the page). They can be <strong>session cookies</strong> (deleted when you close your browser) or <strong>persistent cookies</strong> (stored until they expire or you delete them).
        </p>

        <h2 style={H2}>2. Cookies We Use</h2>
        <p style={PROSE}>
          iBuyNaija uses the minimum number of cookies necessary to operate the Platform. We do <strong>not</strong> use advertising cookies, cross-site tracking cookies, or social media tracking pixels.
        </p>

        {/* Table */}
        <div style={{ overflowX: 'auto', margin: '24px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(27,42,74,0.08)' }}>
            <thead>
              <tr style={{ background: '#1B2A4A' }}>
                {['Cookie Name', 'Type', 'Purpose', 'Expires'].map((h) => (
                  <th key={h} style={{ ...TABLE_CELL, color: '#F7F1E3', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, textAlign: 'left', borderBottom: 'none' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={TABLE_CELL}><code style={{ fontSize: 13, background: 'rgba(27,42,74,0.06)', padding: '1px 5px', borderRadius: 4 }}>ib_buyer</code></td>
                <td style={TABLE_CELL}>Essential · First-party</td>
                <td style={TABLE_CELL}>Keeps buyers logged in across page loads. Contains a secure session identifier.</td>
                <td style={TABLE_CELL}>30 days or browser close</td>
              </tr>
              <tr style={{ background: 'rgba(27,42,74,0.02)' }}>
                <td style={TABLE_CELL}><code style={{ fontSize: 13, background: 'rgba(27,42,74,0.06)', padding: '1px 5px', borderRadius: 4 }}>ib_seller</code></td>
                <td style={TABLE_CELL}>Essential · First-party</td>
                <td style={TABLE_CELL}>Keeps sellers and service providers logged in to their dashboard. Contains a secure session identifier.</td>
                <td style={TABLE_CELL}>30 days or browser close</td>
              </tr>
              <tr>
                <td style={TABLE_CELL}><code style={{ fontSize: 13, background: 'rgba(27,42,74,0.06)', padding: '1px 5px', borderRadius: 4 }}>res.cloudinary.com</code></td>
                <td style={TABLE_CELL}>Functional · Third-party</td>
                <td style={TABLE_CELL}>Cloudinary may set technical cookies to serve and optimise the product and service images hosted on their CDN. These are not used for tracking.</td>
                <td style={TABLE_CELL}>Varies (set by Cloudinary)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 style={H2}>3. Essential Cookies</h2>
        <p style={PROSE}>
          The <code style={{ fontSize: 14, background: 'rgba(27,42,74,0.06)', padding: '1px 5px', borderRadius: 4 }}>ib_buyer</code> and <code style={{ fontSize: 14, background: 'rgba(27,42,74,0.06)', padding: '1px 5px', borderRadius: 4 }}>ib_seller</code> cookies are <strong>strictly necessary</strong> for the Platform to function. Without them, you cannot stay logged in, view your dashboard, place orders, or manage listings. Because they are essential, they are set automatically when you log in and do not require your consent.
        </p>
        <p style={PROSE}>
          These cookies do not contain your name, email address, or any other personal information in their value — only an encrypted identifier that our servers use to look up your session.
        </p>

        <h2 style={H2}>4. Analytics and Advertising Cookies</h2>
        <p style={PROSE}>
          <strong>We do not use Google Analytics, Facebook Pixel, or any other third-party analytics or advertising cookie.</strong> We do not track your behaviour across other websites.
        </p>

        <h2 style={H2}>5. How to Manage Cookies</h2>
        <p style={PROSE}>
          Because we only use essential cookies, there is no cookie consent banner on iBuyNaija — consent is not required for strictly necessary cookies under Nigerian data protection law.
        </p>
        <p style={PROSE}>
          You can control or delete cookies through your browser settings. Deleting the iBuyNaija session cookies will log you out. Instructions for common browsers:
        </p>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li><strong>Google Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
          <li><strong>Mozilla Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data</li>
          <li><strong>Safari (iPhone / iPad):</strong> Settings → Safari → Advanced → Website Data</li>
          <li><strong>Microsoft Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies and site data</li>
        </ul>

        <h2 style={H2}>6. Changes to This Policy</h2>
        <p style={PROSE}>
          If we introduce new types of cookies in the future, we will update this policy and notify users as appropriate. We will always seek your consent before setting any non-essential cookies.
        </p>

        <h2 style={H2}>7. Contact</h2>
        <p style={PROSE}>
          For questions about how we use cookies, contact us at <strong>privacy@ibuynaija.com</strong>.
        </p>

      </main>
    </>
  );
}
