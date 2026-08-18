/**
 * lib/ranking.ts
 *
 * THE shared 6-band sort function for ibuynaija.com search and category browse.
 *
 * IMPORTANT: This is the single implementation of the ranking logic.
 * Do NOT copy-paste this into individual pages. Import and call it.
 *
 * Band hierarchy (lower number = higher position in results):
 *   1  Verified seller, same city/LGA as buyer
 *   2  Verified seller, same state as buyer (different city)
 *   3  Verified seller, different state
 *   4  Unverified seller, same city/LGA as buyer
 *   5  Unverified seller, same state as buyer (different city)
 *   6  Unverified seller, different state
 *
 * Referral boost:
 *   When sellers.referral_boost_active_until > NOW(), the seller moves one
 *   tier up within their own verified/unverified half.
 *   Constraint: an unverified seller's effective band is never < 4, so a
 *   boosted unverified seller NEVER outranks any verified seller.
 *   See lib/referral-utils.ts → applyBoostToBand for the TypeScript version.
 *
 * Within each band, results are sorted by engagement_score DESC, then date_posted DESC.
 * Location is a ranking signal, NOT a hard filter — all sellers appear in results.
 */

import type { RankingContext } from '@/types';
import { applyBoostToBand } from '@/lib/referral-utils';

export type RankableSeller = {
  verified_status: boolean;
  state: string;
  city_area: string;
  /** ISO string or Date; null/undefined means no active boost. */
  referral_boost_active_until?: string | Date | null;
};

/**
 * Compute the effective rank band for a seller given the buyer's location,
 * incorporating the referral boost when active.
 * Returns a number 1–6 (lower is better).
 */
export function computeRankBand(
  seller: RankableSeller,
  context: RankingContext,
): number {
  const { verified_status, state, city_area } = seller;
  const buyerCity  = context.buyer_city?.toLowerCase().trim()  ?? '';
  const buyerState = context.buyer_state?.toLowerCase().trim() ?? '';
  const sellerCity  = city_area.toLowerCase().trim();
  const sellerState = state.toLowerCase().trim();

  const sameCity  = buyerCity  !== '' && sellerCity  === buyerCity;
  const sameState = buyerState !== '' && sellerState === buyerState;

  let baseBand: number;
  if (verified_status) {
    if (sameCity)        baseBand = 1;
    else if (sameState)  baseBand = 2;
    else                 baseBand = 3;
  } else {
    if (sameCity)        baseBand = 4;
    else if (sameState)  baseBand = 5;
    else                 baseBand = 6;
  }

  const boostEnd = seller.referral_boost_active_until;
  const boostDate = boostEnd instanceof Date ? boostEnd
    : boostEnd ? new Date(boostEnd)
    : null;
  const boostActive = boostDate !== null && boostDate > new Date();

  return applyBoostToBand(baseBand, verified_status, boostActive);
}

/**
 * SQL expression for the effective rank band, incorporating the referral boost.
 *
 * Uses GREATEST to clamp boosted unverified sellers to band 4 (their floor),
 * ensuring they can never rank above verified sellers regardless of boost.
 *
 *   Verified floor = 1,  Unverified floor = 4
 *   effective_band = GREATEST(base_band - boost_decrement, floor)
 *
 * Usage in a raw query:
 *   ORDER BY ${rankBandSql('$1', '$2')} ASC, engagement_score DESC, date_posted DESC
 *
 * @param buyerCityParam  SQL parameter placeholder for buyer city  (e.g. '$1')
 * @param buyerStateParam SQL parameter placeholder for buyer state (e.g. '$2')
 */
export function rankBandSql(buyerCityParam: string, buyerStateParam: string): string {
  return `
    GREATEST(
      CASE
        WHEN s.verified_status AND LOWER(s.city_area) = LOWER(${buyerCityParam}) THEN 1
        WHEN s.verified_status AND LOWER(s.state)     = LOWER(${buyerStateParam}) THEN 2
        WHEN s.verified_status                                                     THEN 3
        WHEN NOT s.verified_status AND LOWER(s.city_area) = LOWER(${buyerCityParam}) THEN 4
        WHEN NOT s.verified_status AND LOWER(s.state)     = LOWER(${buyerStateParam}) THEN 5
        ELSE 6
      END
      - CASE WHEN s.referral_boost_active_until > NOW() THEN 1 ELSE 0 END,
      CASE WHEN s.verified_status THEN 1 ELSE 4 END
    )
  `.trim();
}

/**
 * Sort an in-memory array of items that include seller + engagement_score.
 * Used when ranking is performed client-side (e.g. small result sets).
 * Boost is applied automatically via computeRankBand if the seller object
 * includes referral_boost_active_until.
 */
export function sortByRankBand<T extends {
  seller: RankableSeller;
  engagement_score?: number;
  date_posted: string;
}>(items: T[], context: RankingContext): T[] {
  return [...items].sort((a, b) => {
    const bandA = computeRankBand(a.seller, context);
    const bandB = computeRankBand(b.seller, context);
    if (bandA !== bandB) return bandA - bandB;

    const scoreA = a.engagement_score ?? 0;
    const scoreB = b.engagement_score ?? 0;
    if (scoreA !== scoreB) return scoreB - scoreA;

    return new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime();
  });
}
