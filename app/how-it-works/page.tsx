import Navbar from '@/components/Navbar';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works | iBuyNaija',
  description: 'Learn how iBuyNaija connects buyers with verified Made-in-Nigeria sellers and service providers.',
};

const SECTION_HEADING: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: 24,
  color: '#1B2A4A',
  margin: '0 0 8px',
};

const BODY: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 15,
  color: '#5A5040',
  lineHeight: 1.75,
  margin: 0,
};

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{
        flexShrink: 0, width: 40, height: 40,
        background: '#1B2A4A', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
        fontSize: 16, color: '#D9A02D',
      }}>
        {number}
      </div>
      <div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 4 }}>
          {title}
        </div>
        <p style={BODY}>{description}</p>
      </div>
    </div>
  );
}

function Card({ icon, heading, body }: { icon: string; heading: string; body: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: '1px solid rgba(27,42,74,0.08)',
      padding: '28px 24px',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 8 }}>
        {heading}
      </div>
      <p style={{ ...BODY, fontSize: 14 }}>{body}</p>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: '#F7F1E3' }}>

        {/* Hero */}
        <section style={{
          background: 'linear-gradient(150deg, #1B2A4A 0%, #2C426B 100%)',
          padding: '56px 24px 64px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(217,160,45,0.15)', border: '1px solid rgba(217,160,45,0.35)', borderRadius: 999, padding: '4px 12px', marginBottom: 20 }}>
              <span style={{ fontSize: 11 }}>🇳🇬</span>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: '#D9A02D', letterSpacing: 1 }}>HOW IT WORKS</span>
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 'clamp(28px, 5vw, 48px)', color: '#F7F1E3', margin: '0 0 16px', lineHeight: 1.15 }}>
              The Made-in-Nigeria marketplace — simple and direct
            </h1>
            <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 16, color: 'rgba(247,241,227,0.75)', lineHeight: 1.7, margin: 0 }}>
              iBuyNaija connects buyers directly with verified Nigerian makers and service providers. No middlemen. No hidden fees. Just real Nigerian goods and talent.
            </p>
          </div>
        </section>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>

          {/* For Buyers */}
          <section style={{ marginBottom: 72 }}>
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: '#C1542C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>For Buyers</div>
              <h2 style={SECTION_HEADING}>Shop Made-in-Nigeria products</h2>
              <p style={{ ...BODY, maxWidth: 580 }}>
                Every product on iBuyNaija is made in Nigeria. Browse by category, search by name, or filter by location to find exactly what you need from a verified Nigerian maker.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <Step number={1} title="Browse or search" description="Use the search bar or category pages to find Made-in-Nigeria products — Ankara fabric, shea butter, handmade furniture, authentic spices and more. Filter results by Nigerian state or city to find sellers near you." />
              <Step number={2} title="View the listing and seller profile" description="Each listing shows the seller's verification status, buyer ratings, product photos and description. You can view the seller's public profile to see their full catalogue and track record." />
              <Step number={3} title="Make an enquiry" description="Click 'Enquire' to notify the seller you are interested. The seller will respond directly — typically via WhatsApp or email — to confirm availability, discuss delivery, and share their bank details." />
              <Step number={4} title="Pay directly to the seller" description="Payment is made directly to the seller's bank account — no payment processor sits in between. Once you have paid, click 'Confirm Payment' on your order page to notify the seller. This is a courtesy notification, not proof of payment." />
              <Step number={5} title="Receive your order" description="The seller fulfils and ships the order. If you are unsatisfied with the product quality, raise the issue directly with the seller. After receiving your order, leave a rating to help future buyers." />
            </div>
          </section>

          {/* For Service Seekers */}
          <section style={{ marginBottom: 72, paddingTop: 48, borderTop: '1px solid rgba(27,42,74,0.08)' }}>
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: '#C1542C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>For Service Seekers</div>
              <h2 style={SECTION_HEADING}>Book skilled Nigerian providers</h2>
              <p style={{ ...BODY, maxWidth: 580 }}>
                From hairdressers and artisans to consultants and caterers — find and book trusted local service providers across Nigeria.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <Step number={1} title="Find a service" description="Browse the Services page or use the search bar. Filter by location to show providers in your state or city. Each listing shows the provider's category, pricing, duration and availability schedule." />
              <Step number={2} title="Submit a booking request" description="Choose your preferred date and time and submit a booking request with a note describing exactly what you need. No payment is taken online at this stage." />
              <Step number={3} title="Provider confirms" description="The provider reviews your request and confirms or declines. You will be notified of the decision. For quote-based services, the provider may propose a price before confirming." />
              <Step number={4} title="Service is delivered" description="Attend the appointment or receive the provider. Payment terms are agreed directly between you and the provider. After the service is complete, you can leave a rating." />
            </div>
          </section>

          {/* For Sellers */}
          <section style={{ marginBottom: 72, paddingTop: 48, borderTop: '1px solid rgba(27,42,74,0.08)' }}>
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: '#C1542C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>For Sellers &amp; Providers</div>
              <h2 style={SECTION_HEADING}>Reach buyers across Nigeria</h2>
              <p style={{ ...BODY, maxWidth: 580 }}>
                List your Made-in-Nigeria products or services and connect with buyers who actively want to support local makers.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <Step number={1} title="Create your seller account" description="Register with your business name, Nigerian state, and contact details. Choose whether you are a product seller, a service provider, or both. Your application is reviewed by the iBuyNaija team." />
              <Step number={2} title="List your products or services" description="Add your listings with photos, descriptions, prices and categories. Every product listing must be made in Nigeria — this is enforced at the point of listing. For services, set your weekly availability schedule and pricing type." />
              <Step number={3} title="Receive enquiries and bookings" description="Buyers enquire about your products or request bookings for your services directly through the platform. Manage everything from your seller dashboard." />
              <Step number={4} title="Get verified" description="After six months of trading on the platform with verified transactions, apply for the iBuyNaija Verified badge. Verified sellers appear higher in search results and earn greater buyer trust." />
            </div>
          </section>

          {/* Trust pillars */}
          <section style={{ marginBottom: 64, paddingTop: 48, borderTop: '1px solid rgba(27,42,74,0.08)' }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={SECTION_HEADING}>Why buyers trust iBuyNaija</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              <Card icon="✅" heading="Made-in-Nigeria guarantee" body="Every listing is required to be a product or service produced in Nigeria. Listings are reviewed before going live and can be reported by the community." />
              <Card icon="🏅" heading="Verified seller badge" body="The gold Verified badge is awarded after six months of active trading with confirmed orders — it is not purchased or self-assigned." />
              <Card icon="⭐" heading="Genuine ratings" body="Only buyers who have placed an order or made a confirmed enquiry on a specific listing can leave a rating. No anonymous or unverified reviews." />
              <Card icon="💳" heading="Direct payment" body="You pay the seller directly via bank transfer. iBuyNaija never holds your money, so there are no platform payment delays or reversals." />
            </div>
          </section>

          {/* FAQ */}
          <section style={{ paddingTop: 48, borderTop: '1px solid rgba(27,42,74,0.08)' }}>
            <h2 style={{ ...SECTION_HEADING, marginBottom: 28 }}>Common questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {[
                {
                  q: 'Is iBuyNaija free for buyers?',
                  a: 'Yes. Browsing, searching, and making enquiries are completely free for buyers. You pay the seller directly with no platform fees added to your purchase.',
                },
                {
                  q: 'What if a product is not actually Made in Nigeria?',
                  a: 'Every listing carries the "Made in Nigeria" declaration submitted by the seller. If you believe a product is not genuinely Nigerian-made, use the Report button on the listing page. The iBuyNaija team reviews all reports.',
                },
                {
                  q: 'How does delivery work?',
                  a: 'Delivery is arranged directly between you and the seller. Terms, costs and timelines should be discussed and agreed before you complete payment. iBuyNaija does not operate its own logistics.',
                },
                {
                  q: 'What if I have a dispute with a seller?',
                  a: 'As payment is direct, disputes are resolved between you and the seller. iBuyNaija can assist by reviewing evidence and, where necessary, suspending sellers who repeatedly fail buyers.',
                },
                {
                  q: 'Can I sell electronics or imported goods?',
                  a: 'No. iBuyNaija does not permit Electronics, Phones & Tablets, Vehicles, or any product that is not made in Nigeria. These categories are not available and listings for such items are removed.',
                },
                {
                  q: 'How do I apply to become a verified seller?',
                  a: 'Verification is available to sellers who have been active on the platform for at least six months and have confirmed transactions. Navigate to your Dashboard and click "Apply for Verification" when you become eligible.',
                },
              ].map(({ q, a }) => (
                <div key={q} style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(27,42,74,0.08)', padding: '20px 24px' }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 8 }}>{q}</div>
                  <p style={{ ...BODY, fontSize: 14 }}>{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div style={{ marginTop: 64, textAlign: 'center' }}>
            <h2 style={{ ...SECTION_HEADING, fontSize: 20, marginBottom: 16 }}>Ready to get started?</h2>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/search" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, background: '#C1542C', color: '#F7F1E3', padding: '13px 28px', borderRadius: 10, textDecoration: 'none' }}>
                Browse the market
              </Link>
              <Link href="/register" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, background: '#1B2A4A', color: '#F7F1E3', padding: '13px 28px', borderRadius: 10, textDecoration: 'none' }}>
                Start selling
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
