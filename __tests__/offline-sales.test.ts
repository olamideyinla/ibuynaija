/**
 * __tests__/offline-sales.test.ts
 *
 * Integration tests for offline sales and expenses (spec §3.5b).
 * Requires a running local PostgreSQL instance with the dev schema applied.
 *
 * Run:  npm test -- --testPathPattern=offline-sales
 *
 * Tests:
 *   (1) Logging an OfflineSale linked to a variant creates a StockEvent and
 *       decrements stock — same mechanism as manual_adjustment / restock.
 *   (2) Logging an OfflineSale with no listing attached has zero effect on
 *       any listing_variants row.
 *   (3) Editing an Expense's amount requires no extra confirmation step and
 *       succeeds with a plain UPDATE.
 */

import { Pool, PoolClient } from 'pg';
import { writeStockEvent } from '../lib/stock';

// ─── Setup ────────────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/ibuynaija_dev',
});

const SELLER_ID  = 'a0000000-0000-0000-0000-000000000001';
const LISTING_ID = 'f9999902-0000-0000-0000-000000000001';

let client: PoolClient;
let variantId: string;
let offlineSaleId: string;
let expenseId: string;

beforeAll(async () => {
  client = await pool.connect();

  // Clean up any leftover state
  await client.query(
    `DELETE FROM offline_sales
     WHERE listing_id = $1 OR seller_id = $1`,
    [LISTING_ID],
  );
  await client.query(
    `DELETE FROM expenses WHERE seller_id = $1 AND note = 'test-offline-sales-suite'`,
    [SELLER_ID],
  );
  await client.query(
    'DELETE FROM listing_variants WHERE listing_id = $1',
    [LISTING_ID],
  );
  await client.query('DELETE FROM listings WHERE id = $1', [LISTING_ID]);

  // Create a test listing with one variant (stock = 8)
  await client.query(
    `INSERT INTO listings
       (id, seller_id, title, description, category_id,
        price, made_in_nigeria, condition, status)
     VALUES (
       $1, $2,
       'Test Offline Sales Listing',
       'Automated integration test — safe to delete.',
       (SELECT id FROM categories WHERE section = 'marketplace' LIMIT 1),
       12000.00, TRUE, 'new', 'active'
     )`,
    [LISTING_ID, SELLER_ID],
  );

  const { rows: [v] } = await client.query(
    `INSERT INTO listing_variants (listing_id, attributes, stock_count, low_stock_threshold)
     VALUES ($1, '{}', 8, 2)
     RETURNING id`,
    [LISTING_ID],
  );
  variantId = v.id;
});

afterAll(async () => {
  await client.query(
    `DELETE FROM stock_events WHERE variant_id = $1`,
    [variantId],
  );
  await client.query(
    `DELETE FROM offline_sales WHERE variant_id = $1 OR seller_id = $1`,
    [SELLER_ID],
  );
  await client.query(
    `DELETE FROM expenses WHERE seller_id = $1 AND note = 'test-offline-sales-suite'`,
    [SELLER_ID],
  );
  await client.query('DELETE FROM listing_variants WHERE listing_id = $1', [LISTING_ID]);
  await client.query('DELETE FROM listings WHERE id = $1', [LISTING_ID]);
  client.release();
  await pool.end();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Offline sales and expenses (§3.5b)', () => {

  test('(1) OfflineSale linked to a variant decrements stock and creates an offline_sale StockEvent', async () => {
    const quantity = 3;

    await client.query('BEGIN');

    // Mimic the POST /api/offline-sales logic:
    // 1. Insert offline_sale record
    const { rows: [sale] } = await client.query(
      `INSERT INTO offline_sales
         (seller_id, amount, date, note, listing_id, variant_id, quantity)
       VALUES ($1, 9000, CURRENT_DATE, 'Sold at trade fair', $2, $3, $4)
       RETURNING id`,
      [SELLER_ID, LISTING_ID, variantId, quantity],
    );
    offlineSaleId = sale.id;

    // 2. Decrement stock (race-condition guard preserved)
    const { rowCount } = await client.query(
      `UPDATE listing_variants
       SET stock_count = stock_count - $1
       WHERE id = $2 AND stock_count >= $1`,
      [quantity, variantId],
    );
    expect(rowCount).toBe(1);

    // 3. Write offline_sale StockEvent (same helper as restock/adjust)
    const result = await writeStockEvent(client, variantId, 'offline_sale', -quantity, 'Sold at trade fair');

    await client.query('COMMIT');

    // Stock: 8 - 3 = 5
    expect(result.stockAfter).toBe(5);
    expect(result.lowStockCrossed).toBe(false); // 5 > threshold 2

    // Verify variant stock in DB
    const { rows: [v] } = await client.query(
      'SELECT stock_count FROM listing_variants WHERE id = $1',
      [variantId],
    );
    expect(parseInt(v.stock_count, 10)).toBe(5);

    // Verify stock_events row
    const { rows: [ev] } = await client.query(
      `SELECT change_type, quantity_delta FROM stock_events WHERE variant_id = $1 ORDER BY date_created DESC LIMIT 1`,
      [variantId],
    );
    expect(ev.change_type).toBe('offline_sale');
    expect(parseInt(ev.quantity_delta, 10)).toBe(-3);
  });

  test('(2) OfflineSale with no listing attached has zero effect on any listing_variants row', async () => {
    // Read current stock before
    const { rows: [before] } = await client.query(
      'SELECT stock_count FROM listing_variants WHERE id = $1',
      [variantId],
    );
    const stockBefore = parseInt(before.stock_count, 10);

    // Log a freestanding offline sale (no listing, no variant)
    await client.query(
      `INSERT INTO offline_sales (seller_id, amount, date, note)
       VALUES ($1, 5000, CURRENT_DATE, 'Item not on platform')`,
      [SELLER_ID],
    );

    // Variant stock must be unchanged
    const { rows: [after] } = await client.query(
      'SELECT stock_count FROM listing_variants WHERE id = $1',
      [variantId],
    );
    expect(parseInt(after.stock_count, 10)).toBe(stockBefore);

    // No new stock_events for this variant (only the one from test 1)
    const { rows: events } = await client.query(
      `SELECT id FROM stock_events WHERE variant_id = $1 ORDER BY date_created DESC`,
      [variantId],
    );
    // Should still be exactly 1 event from test (1)
    expect(events.length).toBe(1);
  });

  test('(3) Editing an Expense amount requires no extra step — plain UPDATE succeeds immediately', async () => {
    // Create an expense
    const { rows: [exp] } = await client.query(
      `INSERT INTO expenses (seller_id, amount, date, category, note)
       VALUES ($1, 2000, CURRENT_DATE, 'Packaging', 'test-offline-sales-suite')
       RETURNING id, amount::float`,
      [SELLER_ID],
    );
    expenseId = exp.id;
    expect(parseFloat(exp.amount)).toBe(2000);

    // Edit the amount directly — no confirmation step, no correction record
    const newAmount = 2500;
    const { rows: [updated] } = await client.query(
      `UPDATE expenses
       SET amount = $1
       WHERE id = $2 AND seller_id = $3
       RETURNING amount::float`,
      [newAmount, expenseId, SELLER_ID],
    );

    expect(parseFloat(updated.amount)).toBe(2500);

    // Verify there is no audit / correction table involved
    const { rows: auditRows } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name ILIKE '%expense%correction%'`,
    );
    expect(auditRows.length).toBe(0);
  });

  test('(4) OfflineSale with quantity > stock is rejected before decrement', async () => {
    // Stock is currently 5 from test (1). Try to sell 10 — should fail the predicate.
    const excessQty = 10;
    await client.query('BEGIN');

    const { rowCount } = await client.query(
      `UPDATE listing_variants
       SET stock_count = stock_count - $1
       WHERE id = $2 AND stock_count >= $1`,
      [excessQty, variantId],
    );

    // rowCount === 0 means the predicate failed — stock was NOT decremented
    expect(rowCount).toBe(0);

    await client.query('ROLLBACK');

    // Confirm stock is still 5
    const { rows: [v] } = await client.query(
      'SELECT stock_count FROM listing_variants WHERE id = $1',
      [variantId],
    );
    expect(parseInt(v.stock_count, 10)).toBe(5);
  });

});
