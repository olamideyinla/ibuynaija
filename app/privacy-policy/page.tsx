import Navbar from '@/components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | iBuyNaija',
  description: 'How iBuyNaija collects, uses and protects your personal data in compliance with the Nigeria Data Protection Act 2023.',
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

const H3: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: 16,
  color: '#1B2A4A',
  margin: '24px 0 8px',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>

        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: '#C1542C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 36, color: '#1B2A4A', margin: '0 0 12px' }}>
            Privacy Policy
          </h1>
          <p style={{ ...PROSE, color: '#8A7E66' }}>
            Last updated: July 2026 &nbsp;·&nbsp; Effective date: 1 January 2025
          </p>
        </div>

        <p style={PROSE}>
          iBuyNaija (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is committed to protecting your personal data. This Privacy Policy explains what information we collect, how we use it, and the rights you have under the <strong>Nigeria Data Protection Act 2023 (NDPA)</strong> and its regulations.
        </p>
        <p style={PROSE}>
          By using the iBuyNaija website (ibuynaija.com) or any related service, you acknowledge that you have read and understood this policy.
        </p>

        <h2 style={H2}>1. Who We Are</h2>
        <p style={PROSE}>
          iBuyNaija operates an exclusively Made-in-Nigeria online marketplace connecting buyers with Nigerian product sellers and service providers. We are the <strong>data controller</strong> for personal data collected through this platform.
        </p>
        <p style={PROSE}>
          For privacy enquiries, contact us at: <strong>privacy@ibuynaija.com</strong>
        </p>

        <h2 style={H2}>2. Data We Collect</h2>

        <h3 style={H3}>2.1 Information you provide directly</h3>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li><strong>Account registration:</strong> email address, password (stored as a one-way hash and never readable), first name, last name, phone number.</li>
          <li><strong>Seller / provider registration:</strong> business name, trading state and city, business description, bank account name, bank name, account number (shared only with buyers who place an order — never shown publicly), CAC registration certificate (where provided), WhatsApp number.</li>
          <li><strong>Orders and enquiries:</strong> delivery address, order details, messages sent through the platform.</li>
          <li><strong>Ratings and reviews:</strong> scores and comments you submit on listings or services.</li>
          <li><strong>Service bookings:</strong> preferred date and time, booking notes.</li>
        </ul>

        <h3 style={H3}>2.2 Information collected automatically</h3>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li><strong>Authentication tokens:</strong> session cookies stored in your browser to keep you logged in. These are first-party cookies and are essential for the service to function.</li>
          <li><strong>Usage data:</strong> pages visited, search queries (without linking them to your identity unless you are logged in), browser type, device type, and IP address — used solely for security monitoring and to improve the platform.</li>
        </ul>

        <h3 style={H3}>2.3 Information from third parties</h3>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li><strong>Cloudinary:</strong> when you upload product or service photos, images are stored and processed by Cloudinary (cloudinary.com). Cloudinary may retain technical metadata about uploaded files per their own privacy policy.</li>
        </ul>

        <h2 style={H2}>3. How We Use Your Data</h2>
        <p style={PROSE}>We process your personal data on the following lawful bases under the NDPA 2023:</p>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li><strong>Performance of a contract:</strong> to create and manage your account, process orders and bookings, and facilitate payments between buyers and sellers.</li>
          <li><strong>Legitimate interests:</strong> to prevent fraud and abuse, monitor platform security, improve our service, and send transactional notifications (e.g. order updates).</li>
          <li><strong>Consent:</strong> to send marketing communications. You may withdraw consent at any time.</li>
          <li><strong>Legal obligation:</strong> to comply with applicable Nigerian law, including the NDPA 2023 and financial regulations.</li>
        </ul>

        <h2 style={H2}>4. How We Share Your Data</h2>
        <p style={PROSE}>We do <strong>not</strong> sell your personal data. We share data only in these circumstances:</p>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li><strong>Between buyers and sellers:</strong> when you place an order, the seller receives your delivery address and contact details to fulfil it. The seller&rsquo;s bank account details are shared with the buyer only on the order confirmation page.</li>
          <li><strong>Service providers:</strong> Supabase (database hosting, operated in compliance with their Data Processing Agreement), Cloudinary (image storage), Vercel (hosting), Termii (SMS OTP verification for seller accounts in Nigeria).</li>
          <li><strong>Legal requirements:</strong> if required by Nigerian law, a court order, or to prevent serious harm.</li>
        </ul>

        <h2 style={H2}>5. Cookies</h2>
        <p style={PROSE}>
          We use only essential first-party cookies to authenticate your session (keep you logged in). We do not use advertising or behavioural tracking cookies. For full details, see our <a href="/cookie-policy" style={{ color: '#C1542C' }}>Cookie Policy</a>.
        </p>

        <h2 style={H2}>6. Data Retention</h2>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li>Account data is retained for as long as your account is active and for up to <strong>2 years</strong> after account deletion, to comply with financial record-keeping obligations.</li>
          <li>Order and transaction records are retained for <strong>6 years</strong> in compliance with Nigerian tax and commercial law.</li>
          <li>Session cookies expire when you close your browser or after <strong>30 days</strong>, whichever is sooner.</li>
        </ul>

        <h2 style={H2}>7. Your Rights</h2>
        <p style={PROSE}>Under the Nigeria Data Protection Act 2023, you have the right to:</p>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li><strong>Access</strong> the personal data we hold about you.</li>
          <li><strong>Correct</strong> inaccurate or incomplete data.</li>
          <li><strong>Delete</strong> your account and associated data (subject to legal retention requirements).</li>
          <li><strong>Object</strong> to processing of your data for marketing purposes.</li>
          <li><strong>Data portability:</strong> receive a copy of your data in a machine-readable format.</li>
          <li><strong>Withdraw consent</strong> at any time where processing is based on consent.</li>
        </ul>
        <p style={PROSE}>
          To exercise any of these rights, email <strong>privacy@ibuynaija.com</strong>. We will respond within 30 days.
        </p>

        <h2 style={H2}>8. Data Security</h2>
        <p style={PROSE}>
          We implement technical and organisational measures to protect your data, including encrypted connections (HTTPS), password hashing using industry-standard bcrypt, row-level security policies on our database, and restricted access controls for administrative functions.
        </p>
        <p style={PROSE}>
          No system is completely secure. If you suspect your account has been compromised, change your password immediately and contact us at <strong>privacy@ibuynaija.com</strong>.
        </p>

        <h2 style={H2}>9. Children&rsquo;s Privacy</h2>
        <p style={PROSE}>
          iBuyNaija is not directed at children under the age of 18. We do not knowingly collect personal data from minors. If you believe a child has provided us with their data, please contact us and we will delete it promptly.
        </p>

        <h2 style={H2}>10. Changes to This Policy</h2>
        <p style={PROSE}>
          We may update this Privacy Policy from time to time. We will notify registered users by email of any material changes and post the updated policy on this page with a revised &ldquo;Last updated&rdquo; date. Continued use of the platform after the effective date constitutes acceptance of the updated policy.
        </p>

        <h2 style={H2}>11. Contact and Complaints</h2>
        <p style={PROSE}>
          For any privacy-related questions or to file a complaint, contact us at <strong>privacy@ibuynaija.com</strong>.
        </p>
        <p style={PROSE}>
          You also have the right to lodge a complaint with the <strong>Nigeria Data Protection Commission (NDPC)</strong> at <strong>ndpc.gov.ng</strong> if you believe your data rights have been violated.
        </p>

      </main>
    </>
  );
}
