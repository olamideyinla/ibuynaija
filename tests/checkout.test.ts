import { test, expect, type APIRequestContext } from '@playwright/test';

// ─── Seed UUIDs ──────────────────────────────────────────────────────────────
const BUYER_ID    = '20000000-0000-0000-0000-000000000001';
const SELLER_A_ID = 'a0000000-0000-0000-0000-000000000001'; // Adaeze Ankara
const SELLER_B_ID = 'a0000000-0000-0000-0000-000000000004'; // Tunde Spice Co.
const DRESS_ID    = 'b0000000-0000-0000-0000-000000000001'; // Ankara Maxi Wrap Dress ₦28,500
const SPICE_ID    = 'b0000000-0000-0000-0000-000000000009'; // Suya Spice Blend ₦1,800
const FURNITURE_NULL_PRICE_ID = 'b0000000-0000-0000-0000-000000000007'; // Custom Dining Set — price NULL

const BUYER_COOKIE = `ibuynaija_buyer_id=${BUYER_ID}`;

// ─── Cleanup helpers ─────────────────────────────────────────────────────────
async function clearCart(request: APIRequestContext) {
  const res = await request.get('/api/cart');
  if (!res.ok()) return;
  const data = await res.json();
  for (const item of data.items ?? []) {
    await request.delete(`/api/cart/${item.id}`);
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Cart & Checkout', () => {
  let buyerRequest: import('@playwright/test').APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    buyerRequest = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      extraHTTPHeaders: { Cookie: BUYER_COOKIE },
    });
  });

  test.afterAll(async () => {
    await buyerRequest.dispose();
  });

  // ── Test 7: No cookie → 401 ─────────────────────────────────────────────
  test('7. GET /api/cart with no cookie → 401', async ({ request }) => {
    const res = await request.get('/api/cart');
    expect(res.status()).toBe(401);
  });

  // ── Test 8: price-null listing → 400 with "quote" ───────────────────────
  test('8. POST /api/cart with price-null listing → 400 containing "quote"', async () => {
    const res = await buyerRequest.post('/api/cart', {
      data: { listing_id: FURNITURE_NULL_PRICE_ID, quantity: 1 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.toLowerCase()).toContain('quote');
  });

  // ── Tests 1-6 depend on a fresh cart, run sequentially ──────────────────
  test('1. Add dress (seller A) + spice (seller B) → cart has 2 items', async () => {
    await clearCart(buyerRequest);

    await buyerRequest.post('/api/cart', { data: { listing_id: DRESS_ID, quantity: 1 } });
    await buyerRequest.post('/api/cart', { data: { listing_id: SPICE_ID, quantity: 1 } });

    const res = await buyerRequest.get('/api/cart');
    expect(res.ok()).toBe(true);
    const { items } = await res.json();
    expect(items).toHaveLength(2);
    const listingIds = items.map((i: { listing_id: string }) => i.listing_id);
    expect(listingIds).toContain(DRESS_ID);
    expect(listingIds).toContain(SPICE_ID);
  });

  let orderA: { id: string; seller_id: string; total: number };
  let orderB: { id: string; seller_id: string; total: number };

  test('2. POST /api/checkout → 2 orders, seller A and B present', async () => {
    const res = await buyerRequest.post('/api/checkout', {
      data: {
        phone: '08012345610',
        delivery_method: 'delivery',
        delivery_address: '14 Mobolaji Johnson Avenue, Ikeja, Lagos',
      },
    });
    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.orders).toHaveLength(2);

    const sellerIds = data.orders.map((o: { seller_id: string }) => o.seller_id);
    expect(sellerIds).toContain(SELLER_A_ID);
    expect(sellerIds).toContain(SELLER_B_ID);

    orderA = data.orders.find((o: { seller_id: string }) => o.seller_id === SELLER_A_ID);
    orderB = data.orders.find((o: { seller_id: string }) => o.seller_id === SELLER_B_ID);
  });

  test('3. Order A: dress listing, unit_price=28500, total=28500', async () => {
    expect(orderA).toBeDefined();
    const res = await buyerRequest.get(`/api/orders/${orderA.id}`);
    expect(res.ok()).toBe(true);
    const { order } = await res.json();
    expect(order.line_items[0].listing_id).toBe(DRESS_ID);
    expect(Number(order.line_items[0].unit_price)).toBe(28500);
    expect(Number(order.total)).toBe(28500);
  });

  test('4. Order B: spice unit_price=1800, qty=1, total=1800', async () => {
    expect(orderB).toBeDefined();
    const res = await buyerRequest.get(`/api/orders/${orderB.id}`);
    expect(res.ok()).toBe(true);
    const { order } = await res.json();
    expect(Number(order.line_items[0].unit_price)).toBe(1800);
    expect(order.line_items[0].qty).toBe(1);
    expect(Number(order.total)).toBe(1800);
  });

  test('5. Claim order A → payment_claimed; order B still awaiting_payment', async () => {
    expect(orderA).toBeDefined();
    expect(orderB).toBeDefined();

    const claimRes = await buyerRequest.post(`/api/orders/${orderA.id}/claim`, { data: {} });
    expect(claimRes.ok()).toBe(true);
    const claimData = await claimRes.json();
    expect(claimData.status).toBe('payment_claimed');

    // Order B unchanged
    const bRes = await buyerRequest.get(`/api/orders/${orderB.id}`);
    const { order: bOrder } = await bRes.json();
    expect(bOrder.status).toBe('awaiting_payment');
  });

  test('6. Claim succeeds with no TERMII_API_KEY (stub path — no throw)', async () => {
    // Re-add spice to get a fresh order since cart was cleared by checkout
    await clearCart(buyerRequest);
    await buyerRequest.post('/api/cart', { data: { listing_id: SPICE_ID, quantity: 1 } });
    const checkoutRes = await buyerRequest.post('/api/checkout', {
      data: {
        phone: '08012345610',
        delivery_method: 'pickup',
      },
    });
    expect(checkoutRes.status()).toBe(201);
    const { orders } = await checkoutRes.json();
    const newOrder = orders[0];

    // Claim should succeed even without Termii key (stub logs to console)
    const res = await buyerRequest.post(`/api/orders/${newOrder.id}/claim`, { data: {} });
    expect(res.status()).toBe(200);
  });
});
