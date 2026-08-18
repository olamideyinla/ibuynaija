/**
 * __tests__/promotions.test.ts
 *
 * Tests for the Promotions feature (Spec §3.4a).
 *
 * Split into two sections:
 *
 * A) UNIT TESTS for applyPromotion() — fast, no DB.
 *    Verifies the formula is correct for both discount types.
 *
 * B) INTEGRATION TESTS against the dev DB.
 *    Creates a real listing + promotions with different date windows,
 *    queries using ACTIVE_PROMO_LATERAL, and asserts:
 *    - active window  → promo applies
 *    - before window  → no promo
 *    - after window   → no promo
 *    - cart total reflects the discounted price, not the original
 *
 * Run: npm test -- --testPathPatterns=promotions
 */

import { Pool } from 'pg';
import { applyPromotion, ACTIVE_PROMO_LATERAL, effectivePriceSql } from '../lib/promotions';

// ─── A. Unit tests ────────────────────────────────────────────────────────────

describe('applyPromotion() — unit', () => {

  test('percentage: 25% off ₦10,000 = ₦7,500', () => {
    const result = applyPromotion(10000, { promo_discount_type: 'percentage', promo_discount_value: 25 });
    expect(result).toBe(7500);
  });

  test('percentage: 100% off = ₦0 (not negative)', () => {
    expect(applyPromotion(5000, { promo_discount_type: 'percentage', promo_discount_value: 100 })).toBe(0);
  });

  test('percentage: clamped at 100 even if value > 100', () => {
    expect(applyPromotion(5000, { promo_discount_type: 'percentage', promo_discount_value: 150 })).toBe(0);
  });

  test('fixed_amount: ₦500 off ₦10,000 = ₦9,500', () => {
    const result = applyPromotion(10000, { promo_discount_type: 'fixed_amount', promo_discount_value: 500 });
    expect(result).toBe(9500);
  });

  test('fixed_amount: discount larger than price floors at ₦0', () => {
    expect(applyPromotion(300, { promo_discount_type: 'fixed_amount', promo_discount_value: 500 })).toBe(0);
  });

  test('null price → null (quote-only listings)', () => {
    expect(applyPromotion(null, { promo_discount_type: 'percentage', promo_discount_value: 20 })).toBeNull();
  });

  test('null promo → null (no active promotion)', () => {
    expect(applyPromotion(10000, null)).toBeNull();
  });

  test('undefined promo → null', () => {
    expect(applyPromotion(10000, undefined)).toBeNull();
  });

});

// ─── B. Integration tests ────────────────────────────────────────────────────

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/ibuynaija_dev',
});

const SELLER_ID  = 'a0000000-0000-0000-0000-000000000001'; // Adaeze (always in seed)
const LISTING_ID = 'f9999900-0000-0000-0000-000000000003'; // test-only UUID
const BASE_PRICE = 10000;

let activePromoId:   string;
let upcomingPromoId: string;
let expiredPromoId:  string;
let variantId:       string;

beforeAll(async () => {
  const client = await pool.connect();
  try {
    // Clean up
    await client.query('DELETE FROM promotions  WHERE listing_id = $1', [LISTING_ID]);
    await client.query('DELETE FROM listing_variants WHERE listing_id = $1', [LISTING_ID]);
    await client.query('DELETE FROM listings WHERE id = $1', [LISTING_ID]);

    // Create test listing
    await client.query(
      `INSERT INTO listings
         (id, seller_id, title, description, category_id, price, made_in_nigeria, condition, status)
       VALUES (
         $1, $2, 'Promotion Test Listing',
         'Automated test — safe to delete.',
         (SELECT id FROM categories WHERE section = 'marketplace' LIMIT 1),
         $3, TRUE, 'new', 'active'
       )`,
      [LISTING_ID, SELLER_ID, BASE_PRICE],
    );

    // Create implicit variant
    const { rows: [v] } = await client.query(
      `INSERT INTO listing_variants (listing_id, attributes, stock_count) VALUES ($1, '{}', 5) RETURNING id`,
      [LISTING_ID],
    );
    variantId = v.id;

    // Active promotion: started yesterday, ends tomorrow  (25% off)
    const { rows: [a] } = await client.query(
      `INSERT INTO promotions (seller_id, scope, listing_id, discount_type, discount_value, start_date, end_date)
       VALUES ($1, 'single_listing', $2, 'percentage', 25,
               NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day')
       RETURNING id`,
      [SELLER_ID, LISTING_ID],
    );
    activePromoId = a.id;

    // Upcoming promotion: starts an hour from now
    const { rows: [u] } = await client.query(
      `INSERT INTO promotions (seller_id, scope, listing_id, discount_type, discount_value, start_date, end_date)
       VALUES ($1, 'single_listing', $2, 'percentage', 10,
               NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 days')
       RETURNING id`,
      [SELLER_ID, LISTING_ID],
    );
    upcomingPromoId = u.id;

    // Expired promotion: ended an hour ago
    const { rows: [e] } = await client.query(
      `INSERT INTO promotions (seller_id, scope, listing_id, discount_type, discount_value, start_date, end_date)
       VALUES ($1, 'single_listing', $2, 'fixed_amount', 500,
               NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour')
       RETURNING id`,
      [SELLER_ID, LISTING_ID],
    );
    expiredPromoId = e.id;
  } finally {
    client.release();
  }
});

afterAll(async () => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM promotions WHERE listing_id = $1', [LISTING_ID]);
    await client.query('DELETE FROM listing_variants WHERE listing_id = $1', [LISTING_ID]);
    await client.query('DELETE FROM listings WHERE id = $1', [LISTING_ID]);
  } finally {
    client.release();
  }
  await pool.end();
});

// Helpers that mirror the exact SQL used in production queries
async function queryEffectivePrice(): Promise<{
  promo_id: string | null;
  promo_discount_type: string | null;
  promo_discount_value: number | null;
  effective_price: number | null;
}> {
  const { rows } = await pool.query(
    `SELECT
       promo.promo_id,
       promo.promo_discount_type,
       promo.promo_discount_value::float,
       ${effectivePriceSql('l.price')}::float AS effective_price
     FROM listings l
     ${ACTIVE_PROMO_LATERAL('l')}
     WHERE l.id = $1`,
    [LISTING_ID],
  );
  return rows[0];
}

// ─── Date window tests ────────────────────────────────────────────────────────

describe('Promotions date-window (DB integration)', () => {

  test('active promotion (within window) is returned and discounts correctly', async () => {
    expect(activePromoId).toBeTruthy();
    const row = await queryEffectivePrice();
    // ACTIVE_PROMO_LATERAL should pick the active one (not upcoming/expired)
    expect(row.promo_id).toBe(activePromoId);
    expect(row.promo_discount_type).toBe('percentage');
    expect(row.promo_discount_value).toBe(25);
    // Effective price = 10000 * (1 - 25/100) = 7500
    expect(row.effective_price).toBeCloseTo(7500, 1);
  });

  test('upcoming promotion is NOT applied before start_date', async () => {
    // Verify the upcoming promo was created but is not the one returned
    const row = await queryEffectivePrice();
    // promo_id should be the active one, not the upcoming one
    expect(row.promo_id).not.toBe(upcomingPromoId);
    // Upcoming promo (10%) should not be applied
    const upcomingEffective = BASE_PRICE * (1 - 10 / 100); // 9000
    expect(row.effective_price).not.toBeCloseTo(upcomingEffective, 1);
  });

  test('expired promotion has no effect after end_date', async () => {
    const row = await queryEffectivePrice();
    // promo_id should not be the expired one
    expect(row.promo_id).not.toBe(expiredPromoId);
    // Expired promo (fixed ₦500) would give 9500 — should not be the result
    expect(row.effective_price).not.toBeCloseTo(9500, 1);
  });

  test('effectivePriceSql mirrors applyPromotion formula exactly', async () => {
    const row = await queryEffectivePrice();
    // Re-compute with JS function using the same promo values the DB returned
    const jsResult = applyPromotion(BASE_PRICE, row.promo_discount_type ? {
      promo_discount_type:  row.promo_discount_type as 'percentage' | 'fixed_amount',
      promo_discount_value: row.promo_discount_value!,
    } : null);
    expect(row.effective_price).toBeCloseTo(jsResult!, 2);
  });

});

// ─── Cart total test ─────────────────────────────────────────────────────────

describe('Cart total with active promotion', () => {

  test('total for qty=3 of discounted listing does NOT equal qty×original', () => {
    const qty       = 3;
    const promo     = { promo_discount_type: 'percentage' as const, promo_discount_value: 25 };
    const effective = applyPromotion(BASE_PRICE, promo)!; // 7500
    const total     = effective * qty;                    // 22500

    expect(total).toBe(22500);
    expect(total).not.toBe(BASE_PRICE * qty); // not 30000
  });

  test('cart GET query returns effective_price, not original', async () => {
    // Insert a cart item for a real seeded user (user 1 from seed)
    const BUYER_ID = '10000000-0000-0000-0000-000000000001';
    const client = await pool.connect();
    let cartItemId: string | null = null;
    try {
      // Insert cart item
      const { rows: [ci] } = await client.query(
        `INSERT INTO cart_items (buyer_id, listing_id, variant_id, quantity)
         VALUES ($1, $2, $3, 2)
         ON CONFLICT (buyer_id, variant_id)
         DO UPDATE SET quantity = 2
         RETURNING id`,
        [BUYER_ID, LISTING_ID, variantId],
      );
      cartItemId = ci.id;

      // Query using the same SQL as the cart GET handler
      const { rows } = await client.query(
        `SELECT
           ${effectivePriceSql('COALESCE(lv.price_override, l.price)')}::float AS price,
           COALESCE(lv.price_override, l.price)::float                          AS original_price
         FROM cart_items ci
         JOIN listings         l  ON l.id  = ci.listing_id
         JOIN listing_variants lv ON lv.id = ci.variant_id
         ${ACTIVE_PROMO_LATERAL('l')}
         WHERE ci.id = $1`,
        [cartItemId],
      );

      expect(rows[0].price).toBeCloseTo(7500, 1);          // discounted
      expect(rows[0].original_price).toBeCloseTo(10000, 1); // unchanged

      // Total for qty=2
      const total = rows[0].price * 2;
      expect(total).toBeCloseTo(15000, 1); // 7500 * 2
    } finally {
      if (cartItemId) {
        await client.query('DELETE FROM cart_items WHERE id = $1', [cartItemId]);
      }
      client.release();
    }
  });

});
