/**
 * __tests__/concurrent-stock.test.ts
 *
 * Integration test for the atomic stock-decrement logic at confirmed_by_seller.
 *
 * Spec §3.4 race-condition requirement:
 *   "If two concurrent orders race for the last unit, only the first
 *    confirmed_by_seller succeeds; the second receives a 409 conflict."
 *
 * What this test does:
 *   1. Creates a listing with ONE variant (stock_count = 1).
 *   2. Simulates two concurrent seller confirmations via two separate DB
 *      clients that both issue:
 *        UPDATE listing_variants
 *        SET stock_count = stock_count - 1
 *        WHERE id = $vid AND stock_count >= 1
 *   3. Asserts exactly ONE update succeeds (rowCount = 1) and ONE fails
 *      (rowCount = 0).
 *   4. Asserts final stock = 0 and listing status = 'sold' (triggered
 *      automatically by the check_listing_stock_on_change trigger from
 *      migration 010).
 *
 * Run:
 *   npm test -- --testPathPatterns=concurrent-stock
 */

import { Pool, PoolClient } from 'pg';

// ─── Setup ────────────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/ibuynaija_dev',
});

const SELLER_ID   = 'a0000000-0000-0000-0000-000000000001'; // Adaeze (always in seed)
const LISTING_ID  = 'f9999900-0000-0000-0000-000000000002'; // test-only UUID

let variantId: string;

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const client = await pool.connect();
  try {
    // Clean up any leftover state
    await client.query('DELETE FROM listing_variants WHERE listing_id = $1', [LISTING_ID]);
    await client.query('DELETE FROM listings WHERE id = $1', [LISTING_ID]);

    // Create test listing (active)
    await client.query(
      `INSERT INTO listings
         (id, seller_id, title, description, category_id,
          price, made_in_nigeria, condition, status)
       VALUES (
         $1, $2,
         'Concurrent Stock Test Listing',
         'Automated integration test — safe to delete.',
         (SELECT id FROM categories WHERE section = 'marketplace' LIMIT 1),
         2500.00, TRUE, 'new', 'active'
       )`,
      [LISTING_ID, SELLER_ID],
    );

    // Create ONE variant with stock_count = 1 (the contested unit)
    const { rows: [v] } = await client.query(
      `INSERT INTO listing_variants (listing_id, attributes, stock_count)
       VALUES ($1, '{}', 1)
       RETURNING id`,
      [LISTING_ID],
    );
    variantId = v.id;
  } finally {
    client.release();
  }
});

afterAll(async () => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM listing_variants WHERE listing_id = $1', [LISTING_ID]);
    await client.query('DELETE FROM listings WHERE id = $1', [LISTING_ID]);
  } finally {
    client.release();
  }
  await pool.end();
});

// ─── Helper: atomic decrement (mirrors app/api/orders/[id]/route.ts logic) ───

async function tryDecrement(client: PoolClient, vid: string, qty: number): Promise<number> {
  const { rowCount } = await client.query(
    `UPDATE listing_variants
     SET stock_count = stock_count - $1
     WHERE id = $2 AND stock_count >= $1`,
    [qty, vid],
  );
  return rowCount ?? 0;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Concurrent stock decrement (race condition)', () => {

  test('exactly one of two concurrent decrements on stock=1 succeeds', async () => {
    expect(variantId).toBeTruthy();

    // Open two separate connections — each representing a different request
    const clientA = await pool.connect();
    const clientB = await pool.connect();

    let resultA: number;
    let resultB: number;

    try {
      // Fire both decrements concurrently.  PostgreSQL serialises the two
      // UPDATEs on the same row via row-level locking; the loser re-evaluates
      // the WHERE clause after the winner commits and finds stock_count = 0.
      [resultA, resultB] = await Promise.all([
        tryDecrement(clientA, variantId, 1),
        tryDecrement(clientB, variantId, 1),
      ]);
    } finally {
      clientA.release();
      clientB.release();
    }

    // Exactly one should have succeeded
    const successes = [resultA, resultB].filter((r) => r === 1).length;
    const failures  = [resultA, resultB].filter((r) => r === 0).length;

    expect(successes).toBe(1);
    expect(failures).toBe(1);
  });

  test('final stock_count is 0 after the race', async () => {
    const { rows: [v] } = await pool.query(
      'SELECT stock_count FROM listing_variants WHERE id = $1',
      [variantId],
    );
    expect(v.stock_count).toBe(0);
  });

  test('listing status auto-flipped to "sold" by trigger', async () => {
    const { rows: [l] } = await pool.query(
      'SELECT status FROM listings WHERE id = $1',
      [LISTING_ID],
    );
    expect(l.status).toBe('sold');
  });

});
