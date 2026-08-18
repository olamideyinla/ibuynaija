import Navbar from '@/components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions | iBuyNaija',
  description: 'The terms and conditions governing your use of the iBuyNaija marketplace.',
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

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>

        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: '#C1542C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 36, color: '#1B2A4A', margin: '0 0 12px' }}>
            Terms &amp; Conditions
          </h1>
          <p style={{ ...PROSE, color: '#8A7E66' }}>
            Last updated: July 2026 &nbsp;·&nbsp; Effective date: 1 January 2025
          </p>
        </div>

        <p style={PROSE}>
          These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of the iBuyNaija website (ibuynaija.com) and any related services (collectively, the &ldquo;Platform&rdquo;). By creating an account or using the Platform, you agree to be bound by these Terms. If you do not agree, do not use the Platform.
        </p>

        <h2 style={H2}>1. About iBuyNaija</h2>
        <p style={PROSE}>
          iBuyNaija is an online marketplace that connects buyers with Nigerian product sellers and service providers. We are a <strong>platform facilitator only</strong> — we are not a party to any transaction between buyers and sellers and we do not buy, sell, hold or handle any goods or funds. All transactions, including payment and delivery, are conducted directly between the buyer and the seller.
        </p>

        <h2 style={H2}>2. Eligibility</h2>
        <p style={PROSE}>
          You must be at least 18 years old to create an account or make a purchase on the Platform. By using the Platform you represent that you meet this requirement. Users under 18 must have the consent of a parent or legal guardian.
        </p>

        <h2 style={H2}>3. Account Registration</h2>
        <p style={PROSE}>
          You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must provide accurate and complete information when registering. Notify us immediately at <strong>hello@ibuynaija.com</strong> if you suspect unauthorised access to your account.
        </p>
        <p style={PROSE}>
          We reserve the right to suspend or terminate accounts that provide false information, engage in fraudulent activity, or violate these Terms.
        </p>

        <h2 style={H2}>4. The Made-in-Nigeria Requirement</h2>
        <p style={PROSE}>
          <strong>Every product listed on iBuyNaija must be made in Nigeria.</strong> This is a non-negotiable requirement of the Platform. By listing a product, the seller warrants that the product is genuinely manufactured, crafted, grown or produced in Nigeria.
        </p>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li>Products that are not made in Nigeria will be removed without notice.</li>
          <li>Sellers who repeatedly list non-Nigerian products may have their accounts terminated.</li>
          <li>The following categories are <strong>permanently prohibited</strong> on iBuyNaija: Electronics, Phones &amp; Tablets, and Vehicles.</li>
          <li>Buyers who encounter a listing they believe misrepresents its origin may use the Report function on the listing page.</li>
        </ul>

        <h2 style={H2}>5. Sellers and Service Providers</h2>

        <h3 style={H3}>5.1 Seller registration and approval</h3>
        <p style={PROSE}>
          Seller accounts are subject to review and approval by iBuyNaija. Approval is not guaranteed. We may reject applications that do not meet our standards for authenticity, completeness or conduct.
        </p>

        <h3 style={H3}>5.2 Seller responsibilities</h3>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li>Listings must be accurate, not misleading, and include genuine photographs of the actual products or services offered.</li>
          <li>Sellers are solely responsible for the quality, safety, legality and delivery of their products and services.</li>
          <li>Sellers must honour orders they accept and communicate promptly with buyers.</li>
          <li>Sellers must keep their bank account details current for the benefit of buyers awaiting payment instructions.</li>
          <li>Service providers must honour confirmed bookings. Repeated unexplained cancellations may result in account suspension.</li>
        </ul>

        <h3 style={H3}>5.3 Verification</h3>
        <p style={PROSE}>
          The iBuyNaija Verified badge is awarded at our sole discretion to sellers who have been active on the Platform for a minimum of <strong>six months</strong> and have completed verifiable transactions. Verification is an internal trust signal; it does not constitute an endorsement by iBuyNaija of the seller&rsquo;s products or services.
        </p>

        <h2 style={H2}>6. Payments</h2>
        <p style={PROSE}>
          All payments are made <strong>directly from buyer to seller</strong> via bank transfer to the seller&rsquo;s Nigerian bank account. iBuyNaija does not process, hold, or facilitate any financial transaction. iBuyNaija is not responsible for:
        </p>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li>Failed or incorrect bank transfers.</li>
          <li>Disputes arising from non-payment or overpayment.</li>
          <li>Fraud by any party to a transaction.</li>
        </ul>
        <p style={PROSE}>
          Clicking &ldquo;Confirm Payment&rdquo; on the order page notifies the seller that a transfer has been made. This is a courtesy notification only and <strong>is not proof of payment</strong>. Buyers are advised to retain bank transfer receipts as evidence of payment.
        </p>

        <h2 style={H2}>7. Orders</h2>
        <p style={PROSE}>
          An order is created when a buyer completes the checkout process. The seller is responsible for confirming, fulfilling and shipping the order. Orders are not automatically cancelled — a seller must manually update the order status. Buyers should contact the seller directly for order updates.
        </p>

        <h2 style={H2}>8. Service Bookings</h2>
        <p style={PROSE}>
          Service bookings are requests only. A booking is not confirmed until the service provider explicitly approves it through the Platform. There is no automatic confirmation. Providers may decline bookings without giving a reason. Payment for services is arranged directly between the booking party and the provider.
        </p>

        <h2 style={H2}>9. Ratings and Reviews</h2>
        <p style={PROSE}>
          Ratings may only be submitted by buyers who have placed an order or made a confirmed enquiry on the specific listing being rated. Ratings must be honest and reflect a genuine transaction. We reserve the right to remove ratings that violate these Terms or appear fraudulent.
        </p>

        <h2 style={H2}>10. Prohibited Conduct</h2>
        <p style={PROSE}>The following are prohibited on the Platform:</p>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li>Listing products that are not made in Nigeria.</li>
          <li>Listing prohibited categories (Electronics, Phones &amp; Tablets, Vehicles).</li>
          <li>Providing false or misleading information in listings, accounts or communications.</li>
          <li>Soliciting payment outside the agreed transaction without delivering goods or services (fraud).</li>
          <li>Creating fake buyer accounts to leave fraudulent ratings.</li>
          <li>Harassing, threatening or defaming other users.</li>
          <li>Scraping, reverse-engineering, or attacking the Platform.</li>
          <li>Using the Platform for any unlawful purpose under Nigerian law.</li>
        </ul>

        <h2 style={H2}>11. Intellectual Property</h2>
        <p style={PROSE}>
          The iBuyNaija name, logo, and platform design are owned by iBuyNaija. Sellers retain ownership of their own product photos and descriptions but grant iBuyNaija a non-exclusive, royalty-free licence to display them on the Platform and in related marketing.
        </p>

        <h2 style={H2}>12. Limitation of Liability</h2>
        <p style={PROSE}>
          To the maximum extent permitted by Nigerian law, iBuyNaija is not liable for:
        </p>
        <ul style={{ ...PROSE, paddingLeft: 24 }}>
          <li>The quality, safety or legality of any product or service listed on the Platform.</li>
          <li>The accuracy of any listing description.</li>
          <li>Any failure by a seller to fulfil an order or by a buyer to make payment.</li>
          <li>Loss of profits, data, or goodwill arising from use of the Platform.</li>
          <li>Unauthorised access to your account where you have failed to secure your credentials.</li>
        </ul>

        <h2 style={H2}>13. Indemnity</h2>
        <p style={PROSE}>
          You agree to indemnify and hold harmless iBuyNaija, its directors, employees and agents from any claims, losses, liabilities or expenses (including legal fees) arising from your use of the Platform, your breach of these Terms, or your violation of any third-party rights.
        </p>

        <h2 style={H2}>14. Governing Law</h2>
        <p style={PROSE}>
          These Terms are governed by the laws of the Federal Republic of Nigeria. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Nigeria.
        </p>

        <h2 style={H2}>15. Changes to These Terms</h2>
        <p style={PROSE}>
          We may update these Terms from time to time. We will notify registered users by email of material changes. Continued use of the Platform after the effective date of updated Terms constitutes acceptance. If you do not agree to updated Terms, you must stop using the Platform and may delete your account.
        </p>

        <h2 style={H2}>16. Contact</h2>
        <p style={PROSE}>
          For questions about these Terms, contact us at <strong>hello@ibuynaija.com</strong>.
        </p>

      </main>
    </>
  );
}
