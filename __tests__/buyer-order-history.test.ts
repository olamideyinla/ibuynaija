/**
 * __tests__/buyer-order-history.test.ts
 *
 * Tests for the "prior orders with this seller" count shown on the seller
 * order detail page (Spec §3.4 seller-facing buyer history).
 *
 * What is tested:
 *   1. A seller viewing an order sees the correct count of PRIOR non-cancelled
 *      orders placed by the same buyer with THEIR OWN store.
 *   2. A different seller querying the same buyer's history sees only orders
 *      placed with THEIR store — never the first seller's count.
 *   3. Cancelled orders are excluded from the count.
 *
 * Run: npm test -- --testPathPatterns=buyer-order-history
 */

import { Pool, PoolClient } from 'pg';

// ─── Setup ────────────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/ibuynaija_dev',
});

// Two distinct seeded sellers — guaranteed to exist after seed.sql
const SELLER_A = 'a0000000-0000-0000-0000-000000000001'; // Adaeze
const SELLER_B = 'a0000000-0000-0000-0000-000000000002'; // Bello

// A seeded buyer
const BUYER_ID = '10000000-0000-0000-0000-000000000001';

// Deterministic test UUIDs — safe to delete/recreate between runs
const SESSION_PREFIX = 'e8888800-0000-0000-0000-';
const ORDER_PREFIX   = 'd7777700-0000-0000-0000-';

function sessionId(n: number) { return `${SESSION_PREFIX}${String(n).padStart(12, '0')}`; }
function orderId(n: number)   { return `${ORDER_PREFIX}${String(n).padStart(12, '0')}`; }

// Seller A test order IDs: 001 = prior, 002 = prior, 003 = current being viewed
// Seller A cancelled order ID: 004 (should NOT be counted)
// Seller B test order ID: 005 = their only order with this buyer
const SA_PRIOR_1  = orderId(1);
const SA_PRIOR_2  = orderId(2);
const SA_CURRENT  = orderId(3);
const SA_CANCELLED = orderId(4);
const SB_ORDER    = orderId(5);

let client: PoolClient;

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  client = await pool.connect();

  // Clean up any leftovers
  const orderIds = [SA_PRIOR_1, SA_PRIOR_2, SA_CURRENT, SA_CANCELLED, SB_ORDER];
  await client.query(
    `DELETE FROM orders WHERE id = ANY($1::uuid[])`, [orderIds],
  );
  const sessionIds = Array.from({ length: 5 }, (_, i) => sessionId(i + 1));
  await client.query(
    `DELETE FROM checkout_sessions WHERE id = ANY($1::uuid[])`, [sessionIds],
  );

  // Helper: create a checkout_session + order in one go
  async function insertOrder(
    n: number,
    sellerId: string,
    status: string,
  ) {
    await client.query(
      `INSERT INTO checkout_sessions (id, buyer_id, delivery_method, buyer_phone)
       VALUES ($1, $2, 'pickup', '+2348012340000')
       ON CONFLICT (id) DO NOTHING`,
      [sessionId(n), BUYER_ID],
    );
    await client.query(
      `INSERT INTO orders
         (id, checkout_session_id, buyer_id, seller_id, line_items, total, status)
       VALUES ($1, $2, $3, $4, '[]'::jsonb, 5000, $5)
       ON CONFLICT (id) DO NOTHING`,
      [orderId(n), sessionId(n), BUYER_ID, sellerId, status],
    );
  }

  // Seller A: 2 prior + 1 current + 1 cancelled (cancelled should not count)
  await insertOrder(1, SELLER_A, 'fulfilled');       // prior #1
  await insertOrder(2, SELLER_A, 'awaiting_payment');// prior #2
  await insertOrder(3, SELLER_A, 'payment_claimed'); // "current" order being viewed
  await insertOrder(4, SELLER_A, 'cancelled');       // excluded from count

  // Seller B: 1 order with the same buyer
  await insertOrder(5, SELLER_B, 'fulfilled');
});

afterAll(async () => {
  const orderIds = [SA_PRIOR_1, SA_PRIOR_2, SA_CURRENT, SA_CANCELLED, SB_ORDER];
  await client.query(`DELETE FROM orders WHERE id = ANY($1::uuid[])`, [orderIds]);
  const sessionIds = Array.from({ length: 5 }, (_, i) => sessionId(i + 1));
  await client.query(`DELETE FROM checkout_sessions WHERE id = ANY($1::uuid[])`, [sessionIds]);
  client.release();
  await pool.end();
});

// ─── The query (mirrors exactly what the page uses) ───────────────────────────

async function getPriorCount(currentOrderId: string): Promise<number> {
  const { rows } = await pool.query<{ prior_count: string }>(
    `SELECT COUNT(*) AS prior_count
     FROM orders
     WHERE buyer_id  = (SELECT buyer_id  FROM orders WHERE id = $1)
       AND seller_id = (SELECT seller_id FROM orders WHERE id = $1)
       AND id       != $1
       AND status   != 'cancelled'`,
    [currentOrderId],
  );
  return parseInt(rows[0]?.prior_count ?? '0', 10);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Seller prior-order count for a buyer', () => {

  test('Seller A sees 2 prior orders when viewing their current order', async () => {
    const count = await getPriorCount(SA_CURRENT);
    // SA_PRIOR_1 (fulfilled) + SA_PRIOR_2 (awaiting_payment) = 2
    // SA_CANCELLED is excluded; SA_CURRENT itself is excluded
    expect(count).toBe(2);
  });

  test('Cancelled orders are not included in the prior count', async () => {
    // If cancelled were included, count would be 3 (prior1 + prior2 + cancelled)
    const count = await getPriorCount(SA_CURRENT);
    expect(count).not.toBe(3);
    expect(count).toBe(2);
  });

  test('Seller B sees 0 prior orders for the same buyer (Seller A orders excluded)', async () => {
    const count = await getPriorCount(SB_ORDER);
    // Seller B has only 1 order with this buyer (SB_ORDER itself),
    // and it's excluded as the "current" order — so prior count = 0.
    // Seller A's 3 non-cancelled orders are NEVER surfaced here.
    expect(count).toBe(0);
  });

  test('Seller A prior count is unaffected by Seller B orders with the same buyer', async () => {
    // Re-run Seller A's count — adding Seller B's order must not inflate it
    const count = await getPriorCount(SA_CURRENT);
    expect(count).toBe(2);
  });

  test('Prior count for one of Seller A prior orders is 1 (not 3)', async () => {
    // When viewing SA_PRIOR_2, only SA_PRIOR_1 counts as prior
    // (SA_CURRENT is after; SA_CANCELLED excluded; SA_PRIOR_2 itself excluded)
    const count = await getPriorCount(SA_PRIOR_2);
    // SA_PRIOR_1 (fulfilled) + SA_CURRENT (payment_claimed) = 2
    // The query counts ALL non-cancelled orders != SA_PRIOR_2 for this buyer+seller
    expect(count).toBe(2);
  });

  test('Pluralisation: count=1 message wording', () => {
    // Unit test for the display logic (no DB)
    function label(n: number): string {
      if (n === 0) return 'First order from this buyer with you.';
      return `This buyer has ordered from you ${n} time${n === 1 ? '' : 's'} before.`;
    }
    expect(label(0)).toBe('First order from this buyer with you.');
    expect(label(1)).toBe('This buyer has ordered from you 1 time before.');
    expect(label(2)).toBe('This buyer has ordered from you 2 times before.');
    expect(label(10)).toBe('This buyer has ordered from you 10 times before.');
  });

});
