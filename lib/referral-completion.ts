/**
 * lib/referral-completion.ts
 *
 * Database-side referral completion logic.
 * Each function accepts an active PoolClient so callers can wrap them in their
 * own transaction (or pass a standalone client for fire-and-forget use).
 *
 * Call sites:
 *   completeSourceAReferral  →  app/api/orders/[id]/route.ts
 *                               when newStatus === 'fulfilled'
 *
 *   completeSourceBReferral  →  app/api/listings/route.ts  (or listings/[id]/route.ts)
 *                               when a seller's FIRST listing transitions to status='active'
 *                               (invoke AFTER the listing row is persisted)
 */

import type { PoolClient } from 'pg';
import { computeNewBoostEnd } from './referral-utils';

/**
 * Mark a pending Source-A referral successful and grant / extend the seller's
 * ranking boost.
 *
 * Finds the pending referral where:
 *   referrer = that seller, referred = that buyer, source = 'A'
 *
 * If no such pending referral exists, returns false without touching anything.
 * If one exists, it is marked successful, and the seller's
 * `referral_boost_active_until` is set to:
 *   - EXISTING end + 30 days  (if the boost is currently active), or
 *   - NOW()       + 30 days  (if the boost is absent or already expired).
 *
 * This ensures a second referral extends the window rather than stacking a
 * separate concurrent boost.
 */
export async function completeSourceAReferral(
  buyerId: string,
  sellerId: string,
  client: PoolClient,
): Promise<boolean> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM referrals
     WHERE referrer_id   = $1
       AND referrer_type = 'seller'
       AND referred_id   = $2
       AND referred_type = 'buyer'
       AND source        = 'A'
       AND status        = 'pending'
     LIMIT 1`,
    [sellerId, buyerId],
  );
  if (rows.length === 0) return false;

  const referralId = rows[0].id;

  // Mark successful
  await client.query(
    `UPDATE referrals
     SET status = 'successful', date_successful = NOW()
     WHERE id = $1`,
    [referralId],
  );

  // Read current boost end for this seller
  const { rows: sellerRows } = await client.query<{ referral_boost_active_until: Date | null }>(
    `SELECT referral_boost_active_until FROM sellers WHERE id = $1`,
    [sellerId],
  );
  const currentEnd: Date | null = sellerRows[0]?.referral_boost_active_until ?? null;
  const newEnd = computeNewBoostEnd(currentEnd);

  // Apply / extend the boost
  await client.query(
    `UPDATE sellers SET referral_boost_active_until = $1 WHERE id = $2`,
    [newEnd, sellerId],
  );

  return true;
}

/**
 * Mark a pending Source-B referral successful and credit the referring buyer.
 *
 * Finds the pending referral where:
 *   referred = that seller, source = 'B'
 *
 * Guard: if a Source-B referral for this seller was already completed, returns
 * false — the credit fires only once regardless of how many listings the seller
 * eventually publishes.
 *
 * Call this AFTER the listing is persisted with status = 'active', and only
 * when it is the seller's first active listing.
 */
export async function completeSourceBReferral(
  sellerId: string,
  client: PoolClient,
): Promise<boolean> {
  // Idempotency guard
  const { rows: done } = await client.query(
    `SELECT 1 FROM referrals
     WHERE referred_id   = $1
       AND referred_type = 'seller'
       AND source        = 'B'
       AND status        = 'successful'
     LIMIT 1`,
    [sellerId],
  );
  if (done.length > 0) return false;

  const { rows } = await client.query<{ id: string; referrer_id: string }>(
    `SELECT id, referrer_id FROM referrals
     WHERE referred_id   = $1
       AND referred_type = 'seller'
       AND source        = 'B'
       AND status        = 'pending'
     LIMIT 1`,
    [sellerId],
  );
  if (rows.length === 0) return false;

  const { id: referralId, referrer_id: referrerUserId } = rows[0];

  await client.query(
    `UPDATE referrals
     SET status = 'successful', date_successful = NOW()
     WHERE id = $1`,
    [referralId],
  );

  // Credit the referring buyer
  await client.query(
    `UPDATE users
     SET referral_credit_count = referral_credit_count + 1
     WHERE id = $1`,
    [referrerUserId],
  );

  return true;
}
