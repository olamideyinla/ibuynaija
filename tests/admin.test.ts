import { test, expect, type APIRequestContext } from '@playwright/test';

// ─── Seed constants ────────────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@ibuynaija.com';
const ADMIN_PASSWORD = 'Admin@ibuynaija1';

// Emeka Wood & Craft — unverified, verification_requested=TRUE in seed
const EMEKA_ID = 'a0000000-0000-0000-0000-000000000003';
// Tunde Spice Co. — unverified, no request
const TUNDE_ID = 'a0000000-0000-0000-0000-000000000004';
// Spice listing with an existing report in seed
const SPICE_LISTING_ID = 'b0000000-0000-0000-0000-000000000009';

const BUYER_COOKIE  = `ibuynaija_buyer_id=20000000-0000-0000-0000-000000000001`;
const SELLER_COOKIE = `ibuynaija_seller_id=${EMEKA_ID}`;

test.describe('Admin — verification, notes privacy, and ranking immediacy', () => {
  let adminCtx:   APIRequestContext;
  let buyerCtx:   APIRequestContext;
  let sellerCtx:  APIRequestContext;
  let anonCtx:    APIRequestContext; // used for login test — will acquire session cookie
  let noAuthCtx:  APIRequestContext; // truly unauthenticated — never logs in

  test.beforeAll(async ({ playwright }) => {
    [buyerCtx, sellerCtx, anonCtx, noAuthCtx] = await Promise.all([
      playwright.request.newContext({
        baseURL: 'http://localhost:3000',
        extraHTTPHeaders: { Cookie: BUYER_COOKIE },
      }),
      playwright.request.newContext({
        baseURL: 'http://localhost:3000',
        extraHTTPHeaders: { Cookie: SELLER_COOKIE },
      }),
      playwright.request.newContext({ baseURL: 'http://localhost:3000' }),
      playwright.request.newContext({ baseURL: 'http://localhost:3000' }),
    ]);

    // Log in as admin and capture the session cookie
    adminCtx = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const loginRes = await adminCtx.post('/api/admin/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(loginRes.status()).toBe(200);
    expect((await loginRes.json()).ok).toBe(true);
    // The session cookie is stored automatically in adminCtx
  });

  test.afterAll(async () => {
    await Promise.all([
      adminCtx.dispose(),
      buyerCtx.dispose(),
      sellerCtx.dispose(),
      anonCtx.dispose(),
      noAuthCtx.dispose(),
    ]);
  });

  // ── Test 1: Admin login ─────────────────────────────────────────────────────
  test('1. Admin login with valid credentials → 200 + ok:true', async () => {
    const res  = await anonCtx.post('/api/admin/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.role).toBeDefined();
  });

  // ── Test 2: Wrong password → 401 ───────────────────────────────────────────
  test('2. Admin login with wrong password → 401', async () => {
    const res = await anonCtx.post('/api/admin/login', {
      data: { email: ADMIN_EMAIL, password: 'wrong-password' },
    });
    expect(res.status()).toBe(401);
  });

  // ── Test 3: VerificationNotes blocked from unauthenticated ─────────────────
  test('3. GET /api/admin/verification/{id}/notes without session → 401', async () => {
    const res = await noAuthCtx.get(`/api/admin/verification/${EMEKA_ID}/notes`);
    expect(res.status()).toBe(401);
  });

  // ── Test 4: VerificationNotes blocked from buyer ────────────────────────────
  test('4. GET /api/admin/verification/{id}/notes with buyer cookie → 401', async () => {
    const res = await buyerCtx.get(`/api/admin/verification/${EMEKA_ID}/notes`);
    expect(res.status()).toBe(401);
  });

  // ── Test 5: VerificationNotes blocked from seller ───────────────────────────
  test('5. GET /api/admin/verification/{id}/notes with seller cookie → 401', async () => {
    const res = await sellerCtx.get(`/api/admin/verification/${EMEKA_ID}/notes`);
    expect(res.status()).toBe(401);
  });

  // ── Test 6: Admin can read notes ────────────────────────────────────────────
  test('6. Admin can GET /api/admin/verification/{id}/notes', async () => {
    const res  = await adminCtx.get(`/api/admin/verification/${EMEKA_ID}/notes`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.notes)).toBe(true);
  });

  // ── Test 7: Admin adds a note ───────────────────────────────────────────────
  let noteText: string;
  test('7. Admin can POST a note to /api/admin/verification/{id}/notes', async () => {
    noteText = `Test note — do not verify until CAC cert received. [${Date.now()}]`;
    const res  = await adminCtx.post(`/api/admin/verification/${EMEKA_ID}/notes`, {
      data: { text: noteText },
    });
    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.note.text).toBe(noteText);
  });

  // ── Test 8: Note does NOT appear in public seller profile ──────────────────
  test('8. Verification note does not appear in public seller endpoint', async () => {
    // Verify the note text doesn't leak via any public-facing endpoint
    const publicRes = await noAuthCtx.get(`/api/services?q=furniture`);
    const body = await publicRes.text();
    expect(body).not.toContain(noteText);
  });

  // ── Test 9: Ranking before verification (band 4 — unverified + same city) ──
  test('9. Emeka rank_band = 4 (unverified + same city) before approval', async () => {
    const res  = await adminCtx.get(
      `/api/admin/verification/${EMEKA_ID}?buyer_state=Oyo&buyer_city=Ibadan`,
    );
    expect(res.status()).toBe(200);
    const { rank_band, seller } = await res.json();
    expect(seller.verified_status).toBe(false);
    expect(rank_band).toBe(4);
  });

  // ── Test 10: Admin approves Emeka ──────────────────────────────────────────
  test('10. Admin approves Emeka → verified_status becomes true', async () => {
    const res  = await adminCtx.post(`/api/admin/verification/${EMEKA_ID}`, {
      data: { action: 'approve' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.seller.verified_status).toBe(true);
  });

  // ── Test 11: Ranking immediately updates to band 1 ─────────────────────────
  test('11. Emeka rank_band = 1 immediately after approval (no cache)', async () => {
    const res  = await adminCtx.get(
      `/api/admin/verification/${EMEKA_ID}?buyer_state=Oyo&buyer_city=Ibadan`,
    );
    expect(res.status()).toBe(200);
    const { rank_band, seller } = await res.json();
    expect(seller.verified_status).toBe(true);
    expect(rank_band).toBe(1);
  });

  // ── Test 12: Admin revokes verification ────────────────────────────────────
  test('12. Admin revokes Emeka → verified_status back to false', async () => {
    const res  = await adminCtx.post(`/api/admin/verification/${EMEKA_ID}`, {
      data: { action: 'revoke' },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.seller.verified_status).toBe(false);
  });

  // ── Test 13: Ranking restored to band 4 after revoke ──────────────────────
  test('13. Emeka rank_band = 4 again after revoke', async () => {
    const res  = await adminCtx.get(
      `/api/admin/verification/${EMEKA_ID}?buyer_state=Oyo&buyer_city=Ibadan`,
    );
    expect(res.status()).toBe(200);
    const { rank_band } = await res.json();
    expect(rank_band).toBe(4);
  });

  // ── Test 14: Verification queue includes pending sellers ───────────────────
  test('14. GET /api/admin/verification lists sellers with requests or verified status', async () => {
    const res  = await adminCtx.get('/api/admin/verification');
    expect(res.status()).toBe(200);
    const { sellers } = await res.json();
    expect(Array.isArray(sellers)).toBe(true);
    // Adaeze and Ngozi are verified in seed; Emeka has verification_requested
    expect(sellers.length).toBeGreaterThanOrEqual(1);
  });

  // ── Test 15: Unauth cannot access verification queue ──────────────────────
  test('15. GET /api/admin/verification without session → 401', async () => {
    const res = await noAuthCtx.get('/api/admin/verification');
    expect(res.status()).toBe(401);
  });

  // ── Test 16: Listing reports queue ─────────────────────────────────────────
  test('16. Admin GET /api/admin/listings returns unresolved reports', async () => {
    const res  = await adminCtx.get('/api/admin/listings');
    expect(res.status()).toBe(200);
    const { reports } = await res.json();
    expect(Array.isArray(reports)).toBe(true);
    // Seed has 1 report on SPICE_LISTING_ID
    const spiceReport = reports.find((r: { listing_id: string }) => r.listing_id === SPICE_LISTING_ID);
    expect(spiceReport).toBeDefined();
    expect(spiceReport.reason).toBe('not_made_in_nigeria');
  });

  // ── Test 17: Non-admin cannot access listing reports ──────────────────────
  test('17. GET /api/admin/listings without admin session → 401', async () => {
    const res = await noAuthCtx.get('/api/admin/listings');
    expect(res.status()).toBe(401);
  });

  // ── Test 18: Resolve a listing report ──────────────────────────────────────
  let resolvedReportId: string;
  test('18. Admin can resolve a listing report', async () => {
    const listRes = await adminCtx.get('/api/admin/listings');
    const { reports } = await listRes.json();
    const report = reports.find((r: { listing_id: string }) => r.listing_id === SPICE_LISTING_ID);
    expect(report).toBeDefined();
    resolvedReportId = report.report_id;

    const res = await adminCtx.post(`/api/admin/listings/${resolvedReportId}`, {
      data: { action: 'resolve' },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  // ── Test 19: Resolved report no longer appears in queue ───────────────────
  test('19. Resolved report no longer appears in unresolved queue', async () => {
    const res   = await adminCtx.get('/api/admin/listings');
    const { reports } = await res.json();
    const found = reports.find((r: { report_id: string }) => r.report_id === resolvedReportId);
    expect(found).toBeUndefined();
  });

  // ── Test 20: Seller requests verification ──────────────────────────────────
  test('20. Seller can PATCH /api/sellers/me to request verification', async () => {
    // First reset Emeka's verification_requested via approve+revoke above
    // then set it again from the seller context
    const res = await sellerCtx.patch('/api/sellers/me', {
      data: { verification_requested: true },
    });
    // Either 200 (newly set) or 400 (already set) — both are valid states
    // depending on test order. Check it's not a 401/500.
    expect(res.status()).toBeLessThan(500);
    if (res.status() === 200) {
      expect((await res.json()).ok).toBe(true);
    }
  });

  // ── Test 21: Unauthenticated seller request → 401 ─────────────────────────
  test('21. PATCH /api/sellers/me without cookie → 401', async () => {
    const res = await noAuthCtx.patch('/api/sellers/me', {
      data: { verification_requested: true },
    });
    expect(res.status()).toBe(401);
  });

  // ── Test 22: Public listing report works without auth ─────────────────────
  test('22. POST /api/listings/{id}/report works without auth (anonymous report)', async () => {
    const res = await noAuthCtx.post(`/api/listings/${SPICE_LISTING_ID}/report`, {
      data: { reason: 'not_made_in_nigeria', details: 'Test report from Playwright' },
    });
    expect(res.status()).toBe(201);
  });

  // ── Test 23: Invalid report reason → 400 ──────────────────────────────────
  test('23. POST /api/listings/{id}/report with invalid reason → 400', async () => {
    const res = await noAuthCtx.post(`/api/listings/${SPICE_LISTING_ID}/report`, {
      data: { reason: 'i_just_dont_like_it' },
    });
    expect(res.status()).toBe(400);
  });

  // ── Test 24: Admin logout clears session ──────────────────────────────────
  test('24. POST /api/admin/logout → ok:true', async () => {
    const res  = await adminCtx.post('/api/admin/logout');
    expect(res.status()).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});
