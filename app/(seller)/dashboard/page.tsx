import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { SELLER_COOKIE } from '@/lib/cookie';
import RequestVerificationClientButton from './RequestVerificationClientButton';
import SellerStats from './SellerStats';
import CopyLinkBox from './CopyLinkBox';

export const metadata = { title: 'Dashboard | iBuyNaija' };

export default async function SellerDashboardPage() {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { rows } = await pool.query(
    `SELECT
       s.id, s.slug, s.business_name, s.state, s.city_area, s.provider_type,
       s.verified_status, s.verification_requested, s.verified_date,
       s.date_created AS seller_since,
       u.full_name, u.email, u.phone, u.date_joined,
       (SELECT COUNT(*) FROM listings l WHERE l.seller_id = s.id AND l.status = 'active') AS active_listings,
       (SELECT COUNT(*) FROM orders o WHERE o.seller_id = s.id AND o.status NOT IN ('cancelled')) AS total_orders,
       (SELECT COUNT(*) FROM bookings b
        JOIN service_offerings so ON so.id = b.service_id
        WHERE so.provider_id = s.id AND b.status = 'requested') AS pending_bookings
     FROM sellers s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [sellerId],
  );
  if (rows.length === 0) redirect('/login');
  const s = rows[0];

  const totalOrders       = parseInt(s.total_orders, 10);
  const pendingBookings   = parseInt(s.pending_bookings, 10);

  // Verification eligibility: ≥ 6 months as a seller + at least 1 order
  const sixMonthsAgo  = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sellerSince   = new Date(s.seller_since);
  const isOldEnough   = sellerSince <= sixMonthsAgo;
  const hasOrders     = totalOrders > 0;
  const canVerify     = isOldEnough && hasOrders;

  // How many months until the 6-month mark
  const monthsActive  = Math.floor(
    (Date.now() - sellerSince.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
  );
  const monthsLeft    = Math.max(0, 6 - monthsActive);

  function NavCard({ href, label, desc }: { href: string; label: string; desc: string }) {
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>{desc}</div>
          </div>
          <span style={{ color: '#8A7E66', fontSize: 18 }}>›</span>
        </div>
      </Link>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: '#1B2A4A', margin: '0 0 6px' }}>
          {s.business_name}
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 32px' }}>
          Seller dashboard
        </p>

        {/* ── Account overview ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
          {/* Personal info card */}
          <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 10 }}>
              Personal
            </div>
            {[
              { label: 'Name',         value: s.full_name },
              { label: 'Email',        value: s.email },
              { label: 'Phone',        value: s.phone },
              { label: 'Member since', value: new Date(s.date_joined).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 6, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13 }}>
                <span style={{ color: '#8A7E66', minWidth: 80, flexShrink: 0 }}>{label}</span>
                <span style={{ color: '#1B2A4A', fontWeight: 600, wordBreak: 'break-all' as const }}>{value ?? '—'}</span>
              </div>
            ))}
            <Link href="/account" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', textDecoration: 'none', marginTop: 6, display: 'inline-block' }}>
              My account →
            </Link>
          </div>

          {/* Business info card */}
          <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 10 }}>
              Business
            </div>
            {[
              { label: 'Location', value: `${s.city_area}, ${s.state}` },
              { label: 'Type',     value: s.provider_type === 'seller' ? 'Product seller' : s.provider_type === 'provider' ? 'Service provider' : 'Products + Services' },
              { label: 'Listings', value: `${parseInt(s.active_listings)} active` },
              { label: 'Orders',   value: `${totalOrders} total` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 6, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13 }}>
                <span style={{ color: '#8A7E66', minWidth: 80, flexShrink: 0 }}>{label}</span>
                <span style={{ color: '#1B2A4A', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
            <Link href={`/shop/${s.slug}`} target="_blank" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', textDecoration: 'none', marginTop: 6, display: 'inline-block' }}>
              View public shop →
            </Link>
          </div>
        </div>

        {/* Performance stats */}
        <SellerStats sellerId={sellerId} />

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          <Link href="/dashboard/listings" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 32, color: '#1B2A4A', marginBottom: 4 }}>
                {parseInt(s.active_listings)}
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66' }}>Active listings</div>
            </div>
          </Link>
          <Link href="/dashboard/bookings" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: `1px solid ${pendingBookings > 0 ? 'rgba(217,160,45,0.4)' : 'rgba(27,42,74,0.08)'}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 32, color: pendingBookings > 0 ? '#9B6F00' : '#1B2A4A', marginBottom: 4 }}>
                {pendingBookings}
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66' }}>Pending bookings</div>
            </div>
          </Link>
        </div>

        {/* Navigation cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          <NavCard href="/dashboard/listings"   label="My Listings"               desc="Manage your product listings" />
          <NavCard href="/dashboard/orders"     label="Orders"                    desc="View and manage customer orders" />
          <NavCard href="/dashboard/services"   label="My Services"               desc="Manage your local service offerings" />
          <NavCard href="/dashboard/bookings"   label="Bookings"                  desc="Manage service booking requests" />
          <NavCard href="/dashboard/promotions" label="Promotions"                desc="Run discounts on your listings — no coupon codes needed" />
          <NavCard href="/dashboard/activity"   label="Business Activity"         desc="Log offline sales and business expenses (self-reported)" />
          <NavCard href="/dashboard/revenue"    label="Revenue & Expense Summary" desc="Track sales, expenses, and promotion impact (self-reported)" />
          <NavCard href="/dashboard/payroll"    label="Payroll"                   desc="Run Nigeria payroll for your staff: PAYE, pension, NHF and remittances" />
        </div>

        {/* QR code */}
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 4 }}>
            Your shop QR code
          </div>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 16px', lineHeight: 1.5 }}>
            Print this on a sign or business card so customers can scan straight to your iBuyNaija shop.
          </p>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/share/seller/${s.slug}/qr`}
              alt="QR code for your shop"
              width={120} height={120}
              style={{ borderRadius: 8, border: '1px solid rgba(27,42,74,0.08)', display: 'block' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a
                href={`/api/share/seller/${s.slug}/qr`}
                download={`ibuynaija-qr-${s.slug}.png`}
                style={{ display: 'inline-block', background: '#1B2A4A', color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}
              >
                Download PNG
              </a>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>900 × 900 px · print-ready</div>
            </div>
          </div>
        </div>

        {/* Referral share link */}
        {(() => {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ibuynaija.com';
          const referralUrl = `${appUrl}/shop/${s.slug}?ref=s_${s.id}`;
          return (
            <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 4 }}>
                Refer buyers, earn a ranking boost
              </div>
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 14px', lineHeight: 1.5 }}>
                Share this link. When a new buyer signs up through it and places an order, your shop moves up in search results for 30 days.
              </p>
              <CopyLinkBox url={referralUrl} />
            </div>
          );
        })()}

        {/* Get Verified — just before Edit Profile */}
        {s.verified_status ? (
          <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: 12, padding: '14px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 20 }}>✓</span>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#2E7D32' }}>Verified seller</div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#2E7D32' }}>
                Your business is verified on iBuyNaija.
                {s.verified_date && ` Verified on ${new Date(s.verified_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
              </div>
            </div>
          </div>
        ) : s.verification_requested ? (
          <div style={{ background: 'rgba(217,160,45,0.1)', border: '1px solid rgba(217,160,45,0.4)', borderRadius: 12, padding: '14px 20px', marginBottom: 28 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#9B6F00', marginBottom: 4 }}>
              Verification pending
            </div>
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#9B6F00' }}>
              Your verification request is under review. We will notify you once a decision is made.
            </div>
          </div>
        ) : canVerify ? (
          <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 12, padding: '18px 20px', marginBottom: 28 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 6 }}>
              Get verified
            </div>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 14px', lineHeight: 1.5 }}>
              Verified sellers appear higher in search results and earn buyer trust. Submit a request and our team will review your business.
            </p>
            <RequestVerificationClientButton />
          </div>
        ) : (
          <div style={{ background: 'rgba(27,42,74,0.03)', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '18px 20px', marginBottom: 28 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#8A7E66', marginBottom: 6 }}>
              Verification not yet available
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!isOldEnough && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', lineHeight: 1.5 }}>
                  <span style={{ color: monthsLeft > 0 ? '#C1542C' : '#2E7D32', flexShrink: 0 }}>○</span>
                  <span>
                    Sellers must be active for at least 6 months before applying.{' '}
                    {monthsLeft > 0
                      ? `You have ${monthsLeft} month${monthsLeft !== 1 ? 's' : ''} to go.`
                      : 'You have reached 6 months — complete the other requirement below.'}
                  </span>
                </div>
              )}
              {!hasOrders && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', lineHeight: 1.5 }}>
                  <span style={{ color: '#C1542C', flexShrink: 0 }}>○</span>
                  <span>You need at least one completed order with a verifiable transaction on iBuyNaija.</span>
                </div>
              )}
              {isOldEnough && hasOrders && (
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#2E7D32' }}>
                  All requirements met — refresh to see your verification button.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Profile — last */}
        <Link href="/dashboard/profile" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 3 }}>Edit Profile</div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>Update business name, location, and bank details</div>
            </div>
            <span style={{ color: '#8A7E66', fontSize: 18 }}>›</span>
          </div>
        </Link>
      </main>
    </>
  );
}
