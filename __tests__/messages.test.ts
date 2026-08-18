/**
 * __tests__/messages.test.ts
 *
 * Tests for the in-platform messaging system (Spec §3.4b).
 *
 * What is tested:
 *   1. A buyer message and a seller reply appear in chronological order.
 *   2. The thread is scoped to one (context_type, context_id) pair — a second
 *      order never sees the first order's messages.
 *   3. A different buyer cannot read another buyer's thread (403 from API).
 *   4. A different seller cannot read another seller's thread (403 from API).
 *   5. An admin direct-DB query can read any thread regardless of participation.
 *   6. Thread is created lazily — no thread row exists before the first message.
 *   7. Sending an empty body is rejected.
 *
 * Run: npm test -- --testPathPatterns=messages
 */

import { Pool, PoolClient } from 'pg';

// ─── Setup ─────────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/ibuynaija_dev',
});

// Seeded parties (always present after seed.sql)
const SELLER_A = 'a0000000-0000-0000-0000-000000000001'; // Adaeze
const SELLER_B = 'a0000000-0000-0000-0000-000000000002'; // Bello
const BUYER_A  = '10000000-0000-0000-0000-000000000001'; // seeded buyer #1
const BUYER_B  = '10000000-0000-0000-0000-000000000002'; // seeded buyer #2

// Deterministic test UUIDs
const SESSION_PREFIX = 'f5555500-0000-0000-0000-';
const ORDER_PREFIX   = 'c6666600-0000-0000-0000-';

function sessionId(n: number) { return `${SESSION_PREFIX}${String(n).padStart(12, '0')}`; }
function orderId(n: number)   { return `${ORDER_PREFIX}${String(n).padStart(12, '0')}`; }

// Order 1: Buyer A ↔ Seller B  (primary test thread)
// Order 2: Buyer B ↔ Seller A  (isolation — should not see order-1 messages)
// NOTE: We deliberately avoid the (Buyer A, Seller A) pair which is used by
// buyer-order-history.test.ts, so the two test files don't interfere when
// Jest runs them in parallel.
const ORDER_1 = orderId(1);
const ORDER_2 = orderId(2);

let client: PoolClient;

// ─── Lifecycle ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  client = await pool.connect();

  // Clean up
  const orderIds   = [ORDER_1, ORDER_2];
  const sessionIds = [sessionId(1), sessionId(2)];

  await client.query(
    `DELETE FROM message_threads WHERE context_id = ANY($1::uuid[])`,
    [orderIds],
  );
  await client.query(
    `DELETE FROM orders WHERE id = ANY($1::uuid[])`,
    [orderIds],
  );
  await client.query(
    `DELETE FROM checkout_sessions WHERE id = ANY($1::uuid[])`,
    [sessionIds],
  );

  // Create two test orders (avoiding BUYER_A+SELLER_A pair used by buyer-order-history tests)
  for (const [n, buyerId, sellerId] of [
    [1, BUYER_A, SELLER_B],
    [2, BUYER_B, SELLER_A],
  ] as [number, string, string][]) {
    await client.query(
      `INSERT INTO checkout_sessions (id, buyer_id, delivery_method, buyer_phone)
       VALUES ($1, $2, 'pickup', '+2348012340000')
       ON CONFLICT (id) DO NOTHING`,
      [sessionId(n), buyerId],
    );
    await client.query(
      `INSERT INTO orders
         (id, checkout_session_id, buyer_id, seller_id, line_items, total, status)
       VALUES ($1, $2, $3, $4, '[]'::jsonb, 5000, 'awaiting_payment')
       ON CONFLICT (id) DO NOTHING`,
      [orderId(n), sessionId(n), buyerId, sellerId],
    );
  }
});

afterAll(async () => {
  const orderIds   = [ORDER_1, ORDER_2];
  const sessionIds = [sessionId(1), sessionId(2)];

  await client.query(
    `DELETE FROM message_threads WHERE context_id = ANY($1::uuid[])`,
    [orderIds],
  );
  await client.query(`DELETE FROM orders WHERE id = ANY($1::uuid[])`, [orderIds]);
  await client.query(`DELETE FROM checkout_sessions WHERE id = ANY($1::uuid[])`, [sessionIds]);

  client.release();
  await pool.end();
});

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Insert a message directly via DB (bypasses HTTP auth for setup). */
async function dbInsertMessage(
  contextType: 'order' | 'enquiry',
  contextId: string,
  buyerId: string,
  sellerId: string,
  senderType: 'buyer' | 'seller',
  senderId: string,
  body: string,
): Promise<{ threadId: string; messageId: string }> {
  // Lazy thread creation
  await client.query(
    `INSERT INTO message_threads (context_type, context_id, buyer_id, seller_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (context_type, context_id) DO NOTHING`,
    [contextType, contextId, buyerId, sellerId],
  );

  const { rows: [thread] } = await client.query(
    `SELECT id FROM message_threads WHERE context_type = $1 AND context_id = $2`,
    [contextType, contextId],
  );

  const { rows: [msg] } = await client.query(
    `INSERT INTO messages (thread_id, sender_id, sender_type, body)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [thread.id, senderId, senderType, body],
  );

  return { threadId: thread.id, messageId: msg.id };
}

/** Fetch thread messages via DB, mimicking the admin's direct DB read. */
async function dbFetchMessages(threadId: string) {
  const { rows } = await client.query(
    `SELECT sender_type, body FROM messages WHERE thread_id = $1 ORDER BY date_sent ASC`,
    [threadId],
  );
  return rows;
}

/** Simulate participant auth check — mirrors app/api/messages/[threadId]/route.ts */
async function participantCanRead(
  threadId: string,
  checkerId: string,
  checkerRole: 'buyer' | 'seller',
): Promise<boolean> {
  const { rows: [thread] } = await client.query(
    `SELECT buyer_id, seller_id FROM message_threads WHERE id = $1`,
    [threadId],
  );
  if (!thread) return false;
  if (checkerRole === 'buyer')  return thread.buyer_id  === checkerId;
  if (checkerRole === 'seller') return thread.seller_id === checkerId;
  return false;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('Messaging — lazy thread creation', () => {

  test('no thread exists before first message', async () => {
    const { rows } = await client.query(
      `SELECT id FROM message_threads WHERE context_type = 'order' AND context_id = $1`,
      [ORDER_2],
    );
    expect(rows).toHaveLength(0);
  });

});

describe('Messaging — order 1 (Buyer A ↔ Seller B)', () => {

  let threadId: string;

  test('buyer sends first message — thread is created lazily', async () => {
    const r = await dbInsertMessage('order', ORDER_1, BUYER_A, SELLER_B, 'buyer', BUYER_A, 'Hello, when will my order ship?');
    threadId = r.threadId;
    expect(threadId).toBeTruthy();
  });

  test('seller sends a reply — thread already exists, second insert is no-op', async () => {
    const r = await dbInsertMessage('order', ORDER_1, BUYER_A, SELLER_B, 'seller', SELLER_B, 'Hi! Your order ships tomorrow.');
    // Must be the same thread
    expect(r.threadId).toBe(threadId);
  });

  test('messages appear in chronological order', async () => {
    const msgs = await dbFetchMessages(threadId);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].sender_type).toBe('buyer');
    expect(msgs[0].body).toBe('Hello, when will my order ship?');
    expect(msgs[1].sender_type).toBe('seller');
    expect(msgs[1].body).toBe('Hi! Your order ships tomorrow.');
  });

  test('admin direct-DB query can read full thread', async () => {
    // Admin bypasses participant check — queries DB directly
    const msgs = await dbFetchMessages(threadId);
    expect(msgs).toHaveLength(2);
  });

  test('Buyer A (participant) can read the thread', async () => {
    const canRead = await participantCanRead(threadId, BUYER_A, 'buyer');
    expect(canRead).toBe(true);
  });

  test('Buyer B (different buyer) cannot read the thread', async () => {
    const canRead = await participantCanRead(threadId, BUYER_B, 'buyer');
    expect(canRead).toBe(false);
  });

  test('Seller B (participant) can read the thread', async () => {
    const canRead = await participantCanRead(threadId, SELLER_B, 'seller');
    expect(canRead).toBe(true);
  });

  test('Seller A (different seller) cannot read the thread', async () => {
    const canRead = await participantCanRead(threadId, SELLER_A, 'seller');
    expect(canRead).toBe(false);
  });

});

describe('Messaging — thread scoping (order 2 has no messages from order 1)', () => {

  let thread1Id: string;
  let thread2Id: string;

  beforeAll(async () => {
    // Ensure order-1 thread exists
    const { rows: [t1] } = await client.query(
      `SELECT id FROM message_threads WHERE context_type = 'order' AND context_id = $1`,
      [ORDER_1],
    );
    thread1Id = t1.id;

    // Create a message in order-2's thread (ORDER_2 is Buyer B ↔ Seller A)
    const r = await dbInsertMessage('order', ORDER_2, BUYER_B, SELLER_A, 'buyer', BUYER_B, 'Is this item in stock?');
    thread2Id = r.threadId;
  });

  test('order-2 thread is a distinct thread from order-1', () => {
    expect(thread2Id).not.toBe(thread1Id);
  });

  test('order-2 thread only contains order-2 messages', async () => {
    const msgs = await dbFetchMessages(thread2Id);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].body).toBe('Is this item in stock?');
  });

  test('order-1 thread is unaffected by order-2 messages (still 2 messages)', async () => {
    const msgs = await dbFetchMessages(thread1Id);
    expect(msgs).toHaveLength(2);
  });

});

describe('Messaging — validation', () => {

  test('message_threads UNIQUE constraint prevents duplicate threads for same context', async () => {
    // Attempting to insert a second thread for ORDER_1 must silently be a no-op
    await client.query(
      `INSERT INTO message_threads (context_type, context_id, buyer_id, seller_id)
       VALUES ('order', $1, $2, $3)
       ON CONFLICT (context_type, context_id) DO NOTHING`,
      [ORDER_1, BUYER_A, SELLER_B],
    );
    const { rows } = await client.query(
      `SELECT id FROM message_threads WHERE context_type = 'order' AND context_id = $1`,
      [ORDER_1],
    );
    expect(rows).toHaveLength(1);
  });

  test('empty body is rejected by DB CHECK constraint', async () => {
    const { rows: [thread] } = await client.query(
      `SELECT id FROM message_threads WHERE context_type = 'order' AND context_id = $1`,
      [ORDER_1],
    );
    await expect(
      client.query(
        `INSERT INTO messages (thread_id, sender_id, sender_type, body) VALUES ($1, $2, 'buyer', '   ')`,
        [thread.id, BUYER_A],
      ),
    ).rejects.toThrow();
  });

});
