/**
 * lib/referral-utils.ts
 *
 * Pure functions for referral reward math.
 * No database imports — every function is testable in isolation.
 *
 * Integration points:
 *   computeNewBoostEnd  → called by lib/referral-completion.ts when marking a
 *                          Source-A referral successful.
 *   applyBoostToBand    → called by lib/ranking.ts inside computeRankBand and
 *                          used to derive the SQL expression in rankBandSql.
 */

/** Duration of one referral boost in milliseconds (30 days). */
export const BOOST_DURATION_MS = 30 * 24 * 60 * 60 * 1_000;

/**
 * Compute the new `referral_boost_active_until` value after a successful
 * Source-A referral.
 *
 * Rules:
 *   - No existing boost (null):   start a fresh 30-day window from `now`.
 *   - Boost currently active:     extend from the existing end date (+30 days).
 *   - Boost already expired:      start a fresh 30-day window from `now`.
 *
 * A second simultaneous referral NEVER creates a separate boost — it only
 * moves the single end-date forward.
 *
 * @param currentBoostEnd  Current value of sellers.referral_boost_active_until,
 *                         or null if no boost has ever been set.
 * @param now              Injection point for the current time (defaults to
 *                         new Date(); overridden in tests for determinism).
 */
export function computeNewBoostEnd(
  currentBoostEnd: Date | null,
  now: Date = new Date(),
): Date {
  // If boost is currently active, extend from its end; otherwise start fresh.
  const base = currentBoostEnd && currentBoostEnd > now ? currentBoostEnd : now;
  return new Date(base.getTime() + BOOST_DURATION_MS);
}

/**
 * Apply the referral boost to a pre-computed 6-band rank value.
 *
 * The boost moves the seller ONE tier up within their own verified/unverified
 * half only.  An unverified seller's boost MUST NEVER produce a band < 4,
 * so a boosted unverified seller can never outrank any verified seller.
 *
 * Band map (lower = better position in search results):
 *   1  Verified  + same city as buyer
 *   2  Verified  + same state
 *   3  Verified  + other
 *   4  Unverified + same city
 *   5  Unverified + same state
 *   6  Unverified + other
 *
 * Boost effect:
 *   Verified   3→2, 2→1, 1 stays at 1   (floor = 1)
 *   Unverified 6→5, 5→4, 4 stays at 4   (floor = 4)
 *
 * @param baseBand    The un-boosted 6-band value (1–6).
 * @param isVerified  Whether the seller is verified.
 * @param boostActive Whether the referral boost is currently active.
 */
export function applyBoostToBand(
  baseBand: number,
  isVerified: boolean,
  boostActive: boolean,
): number {
  if (!boostActive) return baseBand;
  const floor = isVerified ? 1 : 4;
  return Math.max(baseBand - 1, floor);
}
