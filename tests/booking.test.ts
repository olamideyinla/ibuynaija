import { test, expect, type APIRequestContext } from '@playwright/test';

// ─── Seed UUIDs ──────────────────────────────────────────────────────────────
const BUYER_ID     = '20000000-0000-0000-0000-000000000001';
const PROVIDER_ID  = 'a0000000-0000-0000-0000-000000000005'; // Amaka Hair Studio

// Fixed-price: Knotless Box Braids ₦35,000 (available Tue–Sat)
const FIXED_SERVICE_ID = 'c0000000-0000-0000-0000-000000000001';
// Quote: Hair Consultation (no fixed price)
const QUOTE_SERVICE_ID = 'c0000000-0000-0000-0000-000000000003';

const BUYER_COOKIE    = `ibuynaija_buyer_id=${BUYER_ID}`;
const PROVIDER_COOKIE = `ibuynaija_seller_id=${PROVIDER_ID}`;

// Next Tuesday at 09:00 WAT — guaranteed within the Tue–Sat schedule
function nextTuesdaySlot(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const daysUntilTue = (2 - d.getDay() + 7) % 7 || 7; // 0 → 7 so we don't pick today
  d.setDate(d.getDate() + daysUntilTue);
  return d.toISOString().slice(0, 10) + 'T09:00:00+01:00';
}

test.describe('Booking flow — no auto-confirm', () => {
  let buyerCtx: APIRequestContext;
  let providerCtx: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    [buyerCtx, providerCtx] = await Promise.all([
      playwright.request.newContext({
        baseURL: 'http://localhost:3000',
        extraHTTPHeaders: { Cookie: BUYER_COOKIE },
      }),
      playwright.request.newContext({
        baseURL: 'http://localhost:3000',
        extraHTTPHeaders: { Cookie: PROVIDER_COOKIE },
      }),
    ]);
  });

  test.afterAll(async () => {
    await Promise.all([buyerCtx.dispose(), providerCtx.dispose()]);
  });

  // ── Test 1: booking created with status=requested, NOT auto-confirmed ─────
  let fixedBookingId: string;

  test('1. Fixed-price booking created with status=requested (never auto-confirmed)', async () => {
    const res = await buyerCtx.post('/api/bookings', {
      data: {
        service_id: FIXED_SERVICE_ID,
        requested_datetime: nextTuesdaySlot(),
        notes: 'Please bring waist-length extensions.',
      },
    });
    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.booking.status).toBe('requested');
    fixedBookingId = data.booking.id;
  });

  // ── Test 2: GET immediately after → still requested ───────────────────────
  test('2. GET booking immediately after creation → still "requested"', async () => {
    expect(fixedBookingId).toBeDefined();
    const res = await buyerCtx.get(`/api/bookings/${fixedBookingId}`);
    expect(res.ok()).toBe(true);
    const { booking } = await res.json();
    expect(booking.status).toBe('requested');
    expect(booking.confirmed_price).toBeNull();
  });

  // ── Test 3: provider confirms → status becomes confirmed ──────────────────
  test('3. Provider calls /confirm → status becomes "confirmed"', async () => {
    expect(fixedBookingId).toBeDefined();
    const res = await providerCtx.post(`/api/bookings/${fixedBookingId}/confirm`, {
      data: { provider_note: 'See you then! Please arrive 5 minutes early.' },
    });
    expect(res.ok()).toBe(true);
    expect((await res.json()).status).toBe('confirmed');
  });

  // ── Test 4: GET after confirm → confirmed ─────────────────────────────────
  test('4. GET after provider confirms → "confirmed"', async () => {
    const res = await buyerCtx.get(`/api/bookings/${fixedBookingId}`);
    expect(res.ok()).toBe(true);
    const { booking } = await res.json();
    expect(booking.status).toBe('confirmed');
    expect(booking.provider_note).toContain('See you then');
  });

  // ── Test 5: provider marks completed ─────────────────────────────────────
  test('5. Provider marks confirmed booking as completed', async () => {
    const res = await providerCtx.post(`/api/bookings/${fixedBookingId}/complete`, {
      data: { outcome: 'completed' },
    });
    expect(res.ok()).toBe(true);
    expect((await res.json()).status).toBe('completed');
  });

  // ── Test 6: quote booking created with status=requested ───────────────────
  let quoteBookingId: string;

  test('6. Quote booking created with status=requested and quote_requested=true', async () => {
    const res = await buyerCtx.post('/api/bookings', {
      data: {
        service_id: QUOTE_SERVICE_ID,
        notes: 'I have 4c hair, shoulder length, lots of breakage. Looking for a plan.',
        preferred_date: nextTuesdaySlot().slice(0, 10),
      },
    });
    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.booking.status).toBe('requested');
    expect(data.booking.quote_requested).toBe(true);
    quoteBookingId = data.booking.id;
  });

  // ── Test 7: confirm quote requires a price ────────────────────────────────
  test('7. Confirming quote booking without confirmed_price → 400', async () => {
    expect(quoteBookingId).toBeDefined();
    const res = await providerCtx.post(`/api/bookings/${quoteBookingId}/confirm`, {
      data: { provider_note: 'Forgot to set price.' },
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/confirmed_price/i);
  });

  // ── Test 8: provider declines quote → cancelled ───────────────────────────
  test('8. Provider declines request → status becomes "cancelled"', async () => {
    expect(quoteBookingId).toBeDefined();
    const res = await providerCtx.post(`/api/bookings/${quoteBookingId}/decline`, {
      data: { provider_note: "I'm fully booked that week." },
    });
    expect(res.ok()).toBe(true);
    expect((await res.json()).status).toBe('cancelled');

    // Verify the status via GET
    const getRes = await buyerCtx.get(`/api/bookings/${quoteBookingId}`);
    const { booking } = await getRes.json();
    expect(booking.status).toBe('cancelled');
    expect(booking.provider_note).toMatch(/booked/i);
  });

  // ── Test 9: cannot confirm a cancelled booking ────────────────────────────
  test('9. Cannot confirm a booking that is already cancelled', async () => {
    const res = await providerCtx.post(`/api/bookings/${quoteBookingId}/confirm`, {
      data: { confirmed_price: 15000 },
    });
    expect(res.status()).toBe(400);
  });

  // ── Test 10: unauthenticated buyer cannot create booking ──────────────────
  test('10. Unauthenticated POST /api/bookings → 401', async ({ request }) => {
    const res = await request.post('/api/bookings', {
      data: { service_id: FIXED_SERVICE_ID, requested_datetime: nextTuesdaySlot() },
    });
    expect(res.status()).toBe(401);
  });

  // ── Test 11: quote booking requires notes ────────────────────────────────
  test('11. Quote booking without notes → 400', async () => {
    const res = await buyerCtx.post('/api/bookings', {
      data: {
        service_id: QUOTE_SERVICE_ID,
        preferred_date: nextTuesdaySlot().slice(0, 10),
        // notes intentionally omitted
      },
    });
    expect(res.status()).toBe(400);
  });
});
