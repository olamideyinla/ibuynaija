/**
 * lib/email.ts
 *
 * Thin wrapper around the Resend REST API (no npm package required).
 * If RESEND_API_KEY is not set, logs to console instead of throwing.
 *
 * All functions are fire-and-forget — call them after COMMIT, not inside the
 * transaction.  A delivery failure should never roll back a business operation.
 */

const FROM = process.env.EMAIL_FROM ?? 'iBuyNaija <noreply@ibuynaija.com>';
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL ?? 'olamide.eyinla@gmail.com';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email stub] To: ${to}\nSubject: ${subject}\n${html.replace(/<[^>]+>/g, '')}`);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[email] Send failed (${res.status}): ${text}`);
    }
  } catch (err) {
    console.error('[email] Send error:', err);
  }
}

// ── Order emails ─────────────────────────────────────────────────────────────

export async function emailNewOrderSeller(opts: {
  sellerEmail: string;
  sellerName: string;
  orderId: string;
  total: number;
  buyerPhone: string;
}): Promise<void> {
  const { sellerEmail, sellerName, orderId, total, buyerPhone } = opts;
  await sendEmail(
    sellerEmail,
    'New order received on iBuyNaija',
    `<p>Hi ${sellerName},</p>
<p>You have received a new order (<strong>#${orderId.slice(0, 8).toUpperCase()}</strong>) totalling <strong>₦${total.toLocaleString()}</strong>.</p>
<p>The buyer's phone: <strong>${buyerPhone}</strong></p>
<p>Please log in to your dashboard to review the order and confirm payment once received.</p>
<p>— iBuyNaija</p>`,
  );
}

export async function emailOrderConfirmedBuyer(opts: {
  buyerEmail: string;
  orderId: string;
  sellerName: string;
  total: number;
}): Promise<void> {
  const { buyerEmail, orderId, sellerName, total } = opts;
  await sendEmail(
    buyerEmail,
    'Your order has been confirmed — iBuyNaija',
    `<p>Great news!</p>
<p>Your order (<strong>#${orderId.slice(0, 8).toUpperCase()}</strong>) from <strong>${sellerName}</strong> worth <strong>₦${total.toLocaleString()}</strong> has been confirmed by the seller.</p>
<p>The seller will be in touch to arrange delivery or pickup.</p>
<p>— iBuyNaija</p>`,
  );
}

export async function emailOrderFulfilledBuyer(opts: {
  buyerEmail: string;
  orderId: string;
  sellerName: string;
}): Promise<void> {
  const { buyerEmail, orderId, sellerName } = opts;
  await sendEmail(
    buyerEmail,
    'Your order has been fulfilled — iBuyNaija',
    `<p>Your order (<strong>#${orderId.slice(0, 8).toUpperCase()}</strong>) from <strong>${sellerName}</strong> has been marked as fulfilled.</p>
<p>We hope you love your Made-in-Nigeria product! Consider leaving a rating to help other buyers.</p>
<p>— iBuyNaija</p>`,
  );
}

export async function emailOrderCancelledBuyer(opts: {
  buyerEmail: string;
  orderId: string;
  sellerName: string;
}): Promise<void> {
  const { buyerEmail, orderId, sellerName } = opts;
  await sendEmail(
    buyerEmail,
    'Your order has been cancelled — iBuyNaija',
    `<p>Your order (<strong>#${orderId.slice(0, 8).toUpperCase()}</strong>) from <strong>${sellerName}</strong> has been cancelled.</p>
<p>If you have already made a bank transfer, please contact the seller directly to arrange a refund.</p>
<p>— iBuyNaija</p>`,
  );
}

// ── Seller application emails ────────────────────────────────────────────────

export async function emailAdminNewSellerApplication(opts: {
  businessName: string;
  ownerEmail: string;
  state: string;
  cityArea: string;
}): Promise<void> {
  const { businessName, ownerEmail, state, cityArea } = opts;
  await sendEmail(
    ADMIN_NOTIFY_EMAIL,
    `New seller application: ${businessName} — iBuyNaija`,
    `<p>A new seller application needs review.</p>
<ul>
  <li><strong>Business name:</strong> ${businessName}</li>
  <li><strong>Applicant email:</strong> ${ownerEmail}</li>
  <li><strong>Location:</strong> ${cityArea}, ${state}</li>
</ul>
<p><a href="https://www.ibuynaija.com/admin/seller-applications">Review in admin →</a></p>`,
  );
}

export async function emailSellerApplicationApproved(opts: {
  ownerEmail: string;
  ownerName: string | null;
  businessName: string;
  slug: string;
  state: string;
  cityArea: string;
  providerType: string;
}): Promise<void> {
  const { ownerEmail, ownerName, businessName, slug, state, cityArea, providerType } = opts;
  const shopUrl = `https://www.ibuynaija.com/shop/${slug}`;
  const typeLabel = providerType === 'provider'
    ? 'Service provider'
    : providerType === 'both'
    ? 'Product seller & service provider'
    : 'Product seller';
  await sendEmail(
    ownerEmail,
    'Your seller application has been approved — iBuyNaija',
    `<p>Hi ${ownerName || businessName},</p>
<p>Good news — your application to sell on iBuyNaija has been <strong>approved</strong>. Your shop is now live!</p>
<p>Here's what we have on file:</p>
<ul>
  <li><strong>Business name:</strong> ${businessName}</li>
  <li><strong>Shop URL:</strong> <a href="${shopUrl}">${shopUrl}</a></li>
  <li><strong>Location:</strong> ${cityArea}, ${state}</li>
  <li><strong>Account type:</strong> ${typeLabel}</li>
</ul>
<p>Log in to your dashboard to add listings, update your bank details, and start selling.</p>
<p>— iBuyNaija</p>`,
  );
}

export async function emailAdminNewNameChangeRequest(opts: {
  currentName: string;
  requestedName: string;
  ownerEmail: string;
}): Promise<void> {
  const { currentName, requestedName, ownerEmail } = opts;
  await sendEmail(
    ADMIN_NOTIFY_EMAIL,
    `Name change request: ${currentName} → ${requestedName} — iBuyNaija`,
    `<p>A seller has requested a business name change.</p>
<ul>
  <li><strong>Current name:</strong> ${currentName}</li>
  <li><strong>Requested name:</strong> ${requestedName}</li>
  <li><strong>Seller email:</strong> ${ownerEmail}</li>
</ul>
<p><a href="https://www.ibuynaija.com/admin/name-changes">Review in admin →</a></p>`,
  );
}

export async function emailNameChangeApproved(opts: {
  ownerEmail: string;
  ownerName: string | null;
  newBusinessName: string;
}): Promise<void> {
  const { ownerEmail, ownerName, newBusinessName } = opts;
  await sendEmail(
    ownerEmail,
    'Your shop name change was approved — iBuyNaija',
    `<p>Hi ${ownerName || newBusinessName},</p>
<p>Your request to change your business name has been <strong>approved</strong>. Your shop now shows as <strong>${newBusinessName}</strong>.</p>
<p>— iBuyNaija</p>`,
  );
}

export async function emailNameChangeRejected(opts: {
  ownerEmail: string;
  ownerName: string | null;
  requestedName: string;
  reason: string | null;
}): Promise<void> {
  const { ownerEmail, ownerName, requestedName, reason } = opts;
  await sendEmail(
    ownerEmail,
    'Your shop name change was not approved — iBuyNaija',
    `<p>Hi ${ownerName || ''},</p>
<p>Your request to change your business name to <strong>${requestedName}</strong> was not approved.</p>
${reason ? `<p>Reason: ${reason}</p>` : ''}
<p>You can submit a new request from your dashboard at any time.</p>
<p>— iBuyNaija</p>`,
  );
}

// ── Verification emails ──────────────────────────────────────────────────────

export async function emailAdminNewVerificationRequest(opts: {
  businessName: string;
  ownerEmail: string;
}): Promise<void> {
  const { businessName, ownerEmail } = opts;
  await sendEmail(
    ADMIN_NOTIFY_EMAIL,
    `New verification request: ${businessName} — iBuyNaija`,
    `<p>A seller has requested verification.</p>
<ul>
  <li><strong>Business name:</strong> ${businessName}</li>
  <li><strong>Seller email:</strong> ${ownerEmail}</li>
</ul>
<p><a href="https://www.ibuynaija.com/admin/verification">Review in admin →</a></p>`,
  );
}

// ── Inventory emails ─────────────────────────────────────────────────────────

export async function emailLowStockAlert(opts: {
  sellerEmail: string;
  sellerName: string;
  listingTitle: string;
  variantDesc: string;   // e.g. "Size: M, Colour: Blue" or "Default variant"
  stockAfter: number;
  threshold: number;
  listingId: string;
}): Promise<void> {
  const { sellerEmail, sellerName, listingTitle, variantDesc, stockAfter, threshold, listingId } = opts;
  await sendEmail(
    sellerEmail,
    `Low stock alert: "${listingTitle}" — iBuyNaija`,
    `<p>Hi ${sellerName},</p>
<p>Your listing <strong>"${listingTitle}"</strong> (${variantDesc}) has fallen below your low-stock threshold of <strong>${threshold}</strong>.</p>
<p>Current stock: <strong>${stockAfter}</strong></p>
<p>Log in to your dashboard to restock before you run out.</p>
<p><a href="https://www.ibuynaija.com/dashboard/listings/${listingId}/stock">Manage stock →</a></p>
<p>— iBuyNaija</p>`,
  );
}

// ── Booking emails ────────────────────────────────────────────────────────────

export async function emailNewBookingProvider(opts: {
  providerEmail: string;
  providerName: string;
  bookingId: string;
  serviceName: string;
  buyerPhone: string;
  requestedDatetime: string;
}): Promise<void> {
  const { providerEmail, providerName, bookingId, serviceName, buyerPhone, requestedDatetime } = opts;
  const dateStr = new Date(requestedDatetime).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
  await sendEmail(
    providerEmail,
    'New booking request — iBuyNaija',
    `<p>Hi ${providerName},</p>
<p>You have a new booking request (<strong>#${bookingId.slice(0, 8).toUpperCase()}</strong>) for <strong>${serviceName}</strong>.</p>
<p>Requested date/time: <strong>${dateStr}</strong></p>
<p>Buyer's phone: <strong>${buyerPhone}</strong></p>
<p>Log in to your dashboard to confirm or decline.</p>
<p>— iBuyNaija</p>`,
  );
}

export async function emailBookingConfirmedBuyer(opts: {
  buyerEmail: string;
  bookingId: string;
  serviceName: string;
  providerName: string;
  confirmedDatetime?: string;
  confirmedPrice?: number;
}): Promise<void> {
  const { buyerEmail, bookingId, serviceName, providerName, confirmedDatetime, confirmedPrice } = opts;
  const dateStr = confirmedDatetime
    ? new Date(confirmedDatetime).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
    : null;
  await sendEmail(
    buyerEmail,
    'Booking confirmed — iBuyNaija',
    `<p>Your booking (<strong>#${bookingId.slice(0, 8).toUpperCase()}</strong>) for <strong>${serviceName}</strong> with <strong>${providerName}</strong> has been confirmed.</p>
${dateStr ? `<p>Scheduled: <strong>${dateStr}</strong></p>` : ''}
${confirmedPrice != null ? `<p>Agreed price: <strong>₦${confirmedPrice.toLocaleString()}</strong></p>` : ''}
<p>The provider will contact you to finalise details.</p>
<p>— iBuyNaija</p>`,
  );
}

export async function emailBookingDeclinedBuyer(opts: {
  buyerEmail: string;
  bookingId: string;
  serviceName: string;
  providerName: string;
}): Promise<void> {
  const { buyerEmail, bookingId, serviceName, providerName } = opts;
  await sendEmail(
    buyerEmail,
    'Booking request declined — iBuyNaija',
    `<p>Unfortunately your booking request (<strong>#${bookingId.slice(0, 8).toUpperCase()}</strong>) for <strong>${serviceName}</strong> with <strong>${providerName}</strong> has been declined.</p>
<p>You can search for other providers on iBuyNaija.</p>
<p>— iBuyNaija</p>`,
  );
}
