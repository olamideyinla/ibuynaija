import Navbar from '@/components/Navbar';
import Link from 'next/link';
import NaijaSeal from '@/components/ui/NaijaSeal';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | iBuyNaija',
  description: 'Learn about iBuyNaija — the marketplace built exclusively for Made-in-Nigeria products and services.',
};

const PROSE: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 16,
  color: '#3A3025',
  lineHeight: 1.8,
};

const H2: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: 26,
  color: '#1B2A4A',
  margin: '0 0 12px',
};

function ValueCard({ icon, heading, body }: { icon: string; heading: string; body: string }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      border: '1px solid rgba(27,42,74,0.08)',
      padding: '28px 24px',
    }}>
      <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700, fontSize: 17, color: '#1B2A4A', marginBottom: 8,
      }}>
        {heading}
      </div>
      <p style={{ ...PROSE, fontSize: 14, margin: 0 }}>{body}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700, fontSize: 36, color: '#D9A02D', marginBottom: 4,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: "'Hanken Grotesk', sans-serif",
        fontSize: 14, color: 'rgba(247,241,227,0.7)',
      }}>
        {label}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: '#F7F1E3' }}>

        {/* Hero */}
        <section style={{
          background: 'linear-gradient(150deg, #1B2A4A 0%, #2C426B 100%)',
          padding: '64px 24px 72px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', opacity: 0.08 }}>
            <NaijaSeal size={280} />
          </div>
          <div style={{ maxWidth: 740, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(217,160,45,0.15)', border: '1px solid rgba(217,160,45,0.35)', borderRadius: 999, padding: '4px 12px', marginBottom: 24 }}>
              <span style={{ fontSize: 11 }}>🇳🇬</span>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: '#D9A02D', letterSpacing: 1 }}>ABOUT IBUYNAIJA</span>
            </div>
            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, fontSize: 'clamp(30px, 5vw, 50px)',
              color: '#F7F1E3', margin: '0 0 20px', lineHeight: 1.15,
            }}>
              Built for Nigeria.<br />
              <span style={{ color: '#D9A02D' }}>By Nigeria. For Nigeria.</span>
            </h1>
            <p style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 17, color: 'rgba(247,241,227,0.78)',
              lineHeight: 1.75, margin: 0,
            }}>
              iBuyNaija exists for one reason: to make it easier to find, trust and buy things that are genuinely made in Nigeria — so that Nigerian makers, artisans and providers can thrive.
            </p>
          </div>
        </section>

        {/* Stats bar */}
        <section style={{ background: '#1B2A4A', padding: '32px 24px' }}>
          <div style={{
            maxWidth: 800, margin: '0 auto',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 24,
          }}>
            <Stat value="36+" label="States represented" />
            <Stat value="100%" label="Made in Nigeria" />
            <Stat value="14+" label="Product categories" />
            <Stat value="0" label="Foreign goods allowed" />
          </div>
        </section>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '72px 24px' }}>

          {/* Our story */}
          <section style={{ marginBottom: 80, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: '#C1542C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Our Story</div>
              <h2 style={H2}>The problem we set out to solve</h2>
              <p style={{ ...PROSE, marginBottom: 16 }}>
                Nigeria produces extraordinary things. Adire cloth hand-dyed in Abeokuta. Shea butter cold-pressed in Kebbi. Handcarved furniture built in Nnewi. Artisan leather goods crafted in Kano. Yet for too long, these products have been hard to find, and even harder to buy with confidence.
              </p>
              <p style={{ ...PROSE, marginBottom: 16 }}>
                The existing marketplaces were built for everything and everyone — which in practice meant Nigerian-made goods competed on equal footing with cheap imports, often losing not on quality but on discoverability and trust signals.
              </p>
              <p style={PROSE}>
                iBuyNaija was built with a single constraint: <strong>every listing must be made in Nigeria</strong>. That constraint is not a limitation — it is the point. It means every search result, every category, every seller you find here has already passed the most important filter.
              </p>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #1B2A4A, #2C426B)',
              borderRadius: 20, padding: '48px 36px',
              display: 'flex', flexDirection: 'column', gap: 20,
            }}>
              {[
                { flag: '🧵', text: 'Ankara and Adire from verified weavers' },
                { flag: '🧴', text: 'Shea butter and skincare from Nigerian producers' },
                { flag: '🪑', text: 'Handmade furniture built by local artisans' },
                { flag: '🌶️', text: 'Spices and food products grown in Nigeria' },
                { flag: '✂️', text: 'Skilled service providers across every state' },
              ].map(({ flag, text }) => (
                <div key={text} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <span style={{ fontSize: 22 }}>{flag}</span>
                  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 15, color: 'rgba(247,241,227,0.85)', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Mission */}
          <section style={{ marginBottom: 80, paddingTop: 64, borderTop: '1px solid rgba(27,42,74,0.08)' }}>
            <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: '#C1542C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Our Mission</div>
              <h2 style={{ ...H2, fontSize: 30, marginBottom: 20 }}>
                Make &ldquo;Made in Nigeria&rdquo; the easiest choice
              </h2>
              <p style={{ ...PROSE, marginBottom: 16 }}>
                We want buying Nigerian-made to be the path of least resistance — not a patriotic sacrifice. That means making it easy to discover great products, easy to trust the sellers behind them, and easy to complete a purchase.
              </p>
              <p style={PROSE}>
                For sellers, our mission is to put them in front of buyers who are specifically looking for Nigerian-made goods — buyers who already understand the value of what they are getting.
              </p>
            </div>
          </section>

          {/* Values */}
          <section style={{ marginBottom: 80, paddingTop: 64, borderTop: '1px solid rgba(27,42,74,0.08)' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: '#C1542C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>What We Stand For</div>
              <h2 style={{ ...H2, fontSize: 28 }}>Our values</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              <ValueCard
                icon="🇳🇬"
                heading="Authenticity first"
                body="Every product on iBuyNaija must be made in Nigeria. This is enforced at the listing stage and monitored by the community. There are no exceptions and no workarounds."
              />
              <ValueCard
                icon="🏅"
                heading="Earned trust"
                body="Our Verified badge cannot be bought. It is awarded after six months of trading with real, confirmed transactions. Trust on iBuyNaija is built, not paid for."
              />
              <ValueCard
                icon="🤝"
                heading="Direct relationships"
                body="Buyers and sellers communicate and transact directly. We do not sit in the middle of payments or conversations. This keeps things transparent and fair."
              />
              <ValueCard
                icon="🌍"
                heading="All of Nigeria"
                body="We are not a Lagos marketplace. Sellers from all 36 states and the FCT are welcome. We actively surface verified sellers from every region through our location-aware ranking."
              />
            </div>
          </section>

          {/* How it's different */}
          <section style={{ marginBottom: 80, paddingTop: 64, borderTop: '1px solid rgba(27,42,74,0.08)' }}>
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: '#C1542C', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Why iBuyNaija</div>
              <h2 style={H2}>How we are different</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                {
                  point: 'No foreign goods. Ever.',
                  detail: 'Other marketplaces allow anything. We allow only products made in Nigeria. This is enforced at the database level — a listing cannot go live without the Made-in-Nigeria flag.',
                },
                {
                  point: 'No prohibited categories.',
                  detail: 'We deliberately exclude Electronics, Phones & Tablets, and Vehicles. These categories are dominated by imports and would undermine the platform\'s purpose. If you are looking for a Nigerian-assembled electronics product, it does not belong here.',
                },
                {
                  point: 'Verification that means something.',
                  detail: 'The Verified badge requires at least six months of active trading and confirmed orders. It is reviewed by our team, not auto-generated. Verified sellers rank higher in search results as a direct reward for earning trust.',
                },
                {
                  point: 'Ratings you can trust.',
                  detail: 'You can only rate a listing if you have placed an order or made a confirmed enquiry on that specific item. No anonymous reviews. No review padding from fake accounts.',
                },
                {
                  point: 'Products and services in one place.',
                  detail: 'Beyond physical goods, Nigerian service providers — hairdressers, artisans, consultants, caterers — can list their services and take bookings through the same platform.',
                },
              ].map(({ point, detail }, i, arr) => (
                <div key={point} style={{
                  display: 'flex', gap: 20, padding: '24px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(27,42,74,0.07)' : 'none',
                }}>
                  <div style={{ flexShrink: 0, width: 28, height: 28, background: '#D9A02D', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#1B2A4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A', marginBottom: 4 }}>{point}</div>
                    <p style={{ ...PROSE, fontSize: 14, margin: 0 }}>{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section style={{ background: 'linear-gradient(150deg, #1B2A4A 0%, #2C426B 100%)', borderRadius: 20, padding: '56px 40px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 28, color: '#F7F1E3', margin: '0 0 14px' }}>
              Join the movement
            </h2>
            <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 16, color: 'rgba(247,241,227,0.75)', lineHeight: 1.7, margin: '0 0 32px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
              Whether you are a buyer who wants to support Nigerian makers or a seller who wants to reach buyers who value what you make — iBuyNaija is your platform.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/search" style={{
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15,
                background: '#C1542C', color: '#F7F1E3',
                padding: '13px 28px', borderRadius: 10, textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(193,84,44,0.4)',
              }}>
                Browse the market
              </Link>
              <Link href="/register" style={{
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15,
                background: 'rgba(247,241,227,0.1)', color: '#F7F1E3',
                border: '1px solid rgba(247,241,227,0.25)',
                padding: '13px 28px', borderRadius: 10, textDecoration: 'none',
              }}>
                Start selling
              </Link>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
