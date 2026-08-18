/**
 * __tests__/stock-expiry.test.ts
 *
 * Integration test for the listing_variants auto-expiry trigger (Migration 010).
 * Requires a running local PostgreSQL instance with the dev schema applied.
 *
 * Run:  npm test -- --testPathPattern=stock-expiry
 *       (or just:  npm test)
 *
 * Tests (per spec §3.3a):
 *   (1) A listing with 2 variants (stock 3 and stock 0) remains Active.
 *   (2) Reducing the last stocked variant to 0 automatically flips
 *       the listing status to "sold".
 */

import { Pool, PoolClient } from 'pg';

// ─── Setup ────────────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/ibuynaija_dev',
});

// Use the first seeded seller (Adaeze) as the owner — guaranteed to exist.
const SELLER_ID   = 'a0000000-0000-0000-0000-000000000001';
const LISTING_ID  = 'f9999900-0000-0000-0000-000000000001'; // test-only UUID

let client: PoolClient;
let variant1Id: string;   // stock = 3
let variant2Id: string;   // stock = 0

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  client = await pool.connect();

  // Clean up any leftover state from a previous run
  await client.query('DELETE FROM listing_variants WHERE listing_id = $1', [LISTING_ID]);
  await client.query('DELETE FROM listings WHERE id = $1', [LISTING_ID]);

  // Create a fresh test listing in 'active' state (no variants yet)
  await client.query(
    `INSERT INTO listings
       (id, seller_id, title, description, category_id,
        price, made_in_nigeria, condition, status)
     VALUES (
       $1, $2,
       'Test Stock Expiry Listing',
       'Automated integration test listing — safe to delete.',
       (SELECT id FROM categories WHERE section = 'marketplace' LIMIT 1),
       5000.00, TRUE, 'new', 'active'
     )`,
    [LISTING_ID, SELLER_ID],
  );
});

afterAll(async () => {
  // Unconditional cleanup so the test is idempotent
  await client.query('DELETE FROM listing_variants WHERE listing_id = $1', [LISTING_ID]);
  await client.query('DELETE FROM listings WHERE id = $1', [LISTING_ID]);
  client.release();
  await pool.end();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Listing stock auto-expiry trigger', () => {

  test('(1) inserting variant stock=3 and variant stock=0 → listing stays Active', async () => {
    // Insert variant 1: stock = 3  (trigger fires; stock > 0 ⇒ no status change)
    const { rows: [v1] } = await client.query(
      `INSERT INTO listing_variants (listing_id, attributes, stock_count)
       VALUES ($1, '{}', 3)
       RETURNING id`,
      [LISTING_ID],
    );
    variant1Id = v1.id;

    // Insert variant 2: stock = 0  (trigger fires; v1 still has stock > 0 ⇒ no change)
    const { rows: [v2] } = await client.query(
      `INSERT INTO listing_variants (listing_id, attributes, stock_count)
       VALUES ($1, '{"size":"XL"}', 0)
       RETURNING id`,
      [LISTING_ID],
    );
    variant2Id = v2.id;

    const { rows: [listing] } = await client.query(
      'SELECT status FROM listings WHERE id = $1',
      [LISTING_ID],
    );

    expect(listing.status).toBe('active');
  });

  test('(2) reducing the last stocked variant to 0 → listing auto-flips to Sold', async () => {
    // Confirm IDs were set by the previous test
    expect(variant1Id).toBeTruthy();
    expect(variant2Id).toBeTruthy();

    // Set variant1 (stock=3) to 0 — now ALL variants are at 0
    await client.query(
      'UPDATE listing_variants SET stock_count = 0 WHERE id = $1',
      [variant1Id],
    );

    // The trigger should have fired and set listing.status = 'sold'
    const { rows: [listing] } = await client.query(
      'SELECT status FROM listings WHERE id = $1',
      [LISTING_ID],
    );

    expect(listing.status).toBe('sold');
  });

  test('is_available reflects stock_count correctly on both variants', async () => {
    const { rows } = await client.query(
      `SELECT stock_count, is_available
       FROM listing_variants WHERE listing_id = $1 ORDER BY stock_count DESC`,
      [LISTING_ID],
    );
    // Both should now be stock=0 and is_available=false
    for (const v of rows) {
      expect(v.stock_count).toBe(0);
      expect(v.is_available).toBe(false);
    }
  });

});
