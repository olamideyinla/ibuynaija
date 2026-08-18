import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { pool } from '@/lib/db';
import { BUYER_COOKIE, SELLER_COOKIE } from '@/lib/cookie';
import { formatNaira } from '@/lib/format';
import AddressBook from './AddressBook';
import BecomeSellerForm from './BecomeSellerForm';
import ActivateSellerButton from './ActivateSellerButton';
import EditProfileForm from './EditProfileForm';

export const metadata = { title: 'My Account — iBuyNaija' };

const ORDER_STATUS_LABEL: Record<string, string> = {
  awaiting_payment:    'Awaiting payment',
  payment_claimed:     'Payment sent',
  confirmed_by_seller: 'Confirmed',
  fulfilled:           'Fulfilled',
  cancelled:           'Cancelled',
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  awaiting_payment:    '#9B6F00',
  payment_claimed:     '#1B2A4A',
  confirmed_by_seller: '#2E7D32',
  fulfilled:           '#2E7D32',
  cancelled:           '#8A7E66',
};

export default async function AccountPage() {
  const store    = await cookies();
  const buyerId  = store.get(BUYER_COOKIE)?.value;
  const sellerId = store.get(SELLER_COOKIE)?.value;
  if (!buyerId) redirect('/login');

  const [userRes, ordersRes, appRes, sellerRes] = await Promise.all([
    pool.query(
      `SELECT full_name, email, phone, phone2, date_joined,
              COALESCE(saved_delivery_addresses, '{}') AS addresses
       FROM users WHERE id = $1`,
      [buyerId],
    ),
    pool.query(
      `SELECT o.id, o.total, o.status, o.date_created, o.line_items,
              s.business_name AS seller_name
       FROM orders o
       JOIN sellers s ON s.id = o.seller_id
       WHERE o.buyer_id = $1
       ORDER BY o.date_created DESC
       LIMIT 10`,
      [buyerId],
    ),
    pool.query(
      `SELECT status, rejection_reason, date_applied
       FROM seller_applications WHERE user_id = $1`,
      [buyerId],
    ),
    sellerId
      ? pool.query(
          `SELECT
             s.id, s.slug, s.business_name, s.state, s.city_area,
             s.verified_status, s.verification_requested, s.provider_type,
             (SELECT COUNT(*)::int FROM listings l WHERE l.seller_id = s.id AND l.status = 'active') AS active_listings,
             (SELECT COUNT(*)::int FROM orders o WHERE o.seller_id = s.id AND o.status NOT IN ('cancelled')) AS total_orders,
             (SELECT COUNT(*)::int FROM bookings b
              JOIN service_offerings so ON so.id = b.service_id
              WHERE so.provider_id = s.id AND b.status = 'requested') AS pending_bookings
           FROM sellers s WHERE s.id = $1`,
          [sellerId],
        )
      : Promise.resolve({ rows: [] }),
  ]);

  if (userRes.rows.length === 0) redirect('/login');

  const user        = userRes.rows[0];
  const orders      = ordersRes.rows;
  const application = appRes.rows[0] ?? null;
  const seller      = sellerRes.rows[0] ?? null;

  // ── layout primitives ───────────────────────────────────────────────────────

  function Card({ children }: { children: React.ReactNode }) {
    return (
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
        {children}
      </div>
    );
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 700, color: '#1B2A4A', margin: '0 0 18px' }}>
        {children}
      </h2>
    );
  }

  function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
      <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14 }}>
        <span style={{ color: '#8A7E66', minWidth: 120, flexShrink: 0 }}>{label}</span>
        <span style={{ color: '#1B2A4A', fontWeight: 600 }}>{value || '—'}</span>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 80px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: '#1B2A4A', margin: '0 0 4px' }}>
            My Account
          </h1>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: 0 }}>
            Member since {new Date(user.date_joined).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── Personal information ── */}
        <Card>
          <SectionTitle>Personal Information</SectionTitle>
          <EditProfileForm
            initialFullName={user.full_name ?? null}
            initialPhone={user.phone ?? null}
            initialPhone2={user.phone2 ?? null}
            email={user.email ?? null}
          />
        </Card>

        {/* ── Seller section ── */}
        {seller ? (
          /* Active seller */
          <Card>
            <SectionTitle>Seller Account</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <InfoRow label="Business name"   value={seller.business_name} />
              <InfoRow label="Location"        value={`${seller.city_area}, ${seller.state}`} />
              <InfoRow label="Account type"    value={seller.provider_type === 'seller' ? 'Product seller' : seller.provider_type === 'provider' ? 'Service provider' : 'Products + Services'} />
              <InfoRow label="Active listings" value={String(seller.active_listings)} />
              <InfoRow label="Total orders"    value={String(seller.total_orders)} />
              {parseInt(seller.pending_bookings) > 0 && (
                <InfoRow label="Pending bookings" value={`${seller.pending_bookings} awaiting response`} />
              )}
              <InfoRow
                label="Verification"
                value={seller.verified_status ? 'Verified ✓' : seller.verification_requested ? 'Review pending' : 'Not verified'}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              <Link
                href="/dashboard"
                style={{
                  background: '#1B2A4A', color: '#F7F1E3',
                  fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
                  padding: '10px 20px', borderRadius: 8, textDecoration: 'none',
                }}
              >
                Seller Dashboard →
              </Link>
              <Link
                href={`/shop/${seller.slug}`}
                target="_blank"
                style={{
                  background: 'none', color: '#1B2A4A',
                  fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 14,
                  padding: '10px 20px', borderRadius: 8,
                  border: '1px solid rgba(27,42,74,0.2)', textDecoration: 'none',
                }}
              >
                View my shop
              </Link>
            </div>
          </Card>

        ) : application?.status === 'pending' ? (
          /* Application under review */
          <Card>
            <SectionTitle>Seller Application</SectionTitle>
            <div style={{ background: 'rgba(217,160,45,0.1)', border: '1px solid rgba(217,160,45,0.3)', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: '#9B6F00', marginBottom: 4 }}>
                Application under review
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#9B6F00', lineHeight: 1.5 }}>
                Submitted on {new Date(application.date_applied).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}. Our team will respond within 2 business days.
              </div>
            </div>
          </Card>

        ) : application?.status === 'approved' ? (
          /* Approved but SELLER_COOKIE not yet set */
          <Card>
            <SectionTitle>Seller Account Approved</SectionTitle>
            <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: '#2E7D32', marginBottom: 4 }}>
                Your seller account has been approved!
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#2E7D32' }}>
                Click below to access your seller dashboard.
              </div>
            </div>
            <ActivateSellerButton />
          </Card>

        ) : application?.status === 'rejected' ? (
          /* Rejected — allow re-application */
          <Card>
            <SectionTitle>Become a Seller</SectionTitle>
            <div style={{ background: 'rgba(193,84,44,0.06)', border: '1px solid rgba(193,84,44,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: '#C1542C', marginBottom: 4 }}>
                Previous application was not approved
              </div>
              {application.rejection_reason && (
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', lineHeight: 1.5 }}>
                  Reason: {application.rejection_reason}
                </div>
              )}
            </div>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 18px' }}>
              You may submit a revised application below.
            </p>
            <BecomeSellerForm />
          </Card>

        ) : (
          /* No application yet */
          <Card>
            <SectionTitle>Become a Seller</SectionTitle>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 20px', lineHeight: 1.6 }}>
              Want to sell your made-in-Nigeria products or services on iBuyNaija? Submit your business details below. Our team will review your application and respond within 2 business days.
            </p>
            <BecomeSellerForm />
          </Card>
        )}

        {/* ── Past orders ── */}
        <Card>
          <SectionTitle>
            Orders{orders.length > 0 ? ` (${orders.length}${orders.length === 10 ? '+' : ''})` : ''}
          </SectionTitle>
          {orders.length === 0 ? (
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: 0 }}>
              No orders yet.{' '}
              <Link href="/" style={{ color: '#1B2A4A', fontWeight: 600 }}>Browse listings →</Link>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orders.map(o => {
                const itemCount = Array.isArray(o.line_items) ? (o.line_items as unknown[]).length : 0;
                return (
                  <Link key={o.id} href={`/orders/${o.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      border: '1px solid rgba(27,42,74,0.1)', borderRadius: 10,
                      padding: '12px 16px', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: 12,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: '#1B2A4A', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {o.seller_name}
                          <span style={{ fontWeight: 400, color: '#8A7E66' }}> · {itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>
                          {new Date(o.date_created).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {' · '}
                          <span style={{ color: ORDER_STATUS_COLOR[o.status] ?? '#8A7E66', fontWeight: 600 }}>
                            {ORDER_STATUS_LABEL[o.status] ?? o.status}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', flexShrink: 0 }}>
                        {formatNaira(o.total)}
                      </div>
                    </div>
                  </Link>
                );
              })}
              {orders.length === 10 && (
                <Link href="/orders" style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A', fontWeight: 600, textDecoration: 'none', textAlign: 'center', padding: '6px 0', display: 'block' }}>
                  View all orders →
                </Link>
              )}
            </div>
          )}
        </Card>

        {/* ── Saved delivery addresses ── */}
        <Card>
          <SectionTitle>Saved Delivery Addresses</SectionTitle>
          <AddressBook initialAddresses={user.addresses as string[]} />
        </Card>

      </main>
    </>
  );
}
