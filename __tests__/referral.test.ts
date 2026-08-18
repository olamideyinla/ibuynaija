/**
 * __tests__/referral.test.ts
 *
 * Confirms the three required referral-scheme properties using pure-function
 * unit tests — no database connection needed.
 *
 * Run: npm test
 *
 * Tests:
 *   (1) Source-A successful referral sets referral_boost_active_until correctly.
 *   (2) A boosted seller's listings never outrank a Verified seller's listings,
 *       even at the most favourable location match.
 *   (3) A second referral during an active boost EXTENDS the existing end date
 *       rather than creating a second simultaneous boost.
 */

import {
  computeNewBoostEnd,
  applyBoostToBand,
  BOOST_DURATION_MS,
} from '../lib/referral-utils';

import { computeRankBand } from '../lib/ranking';
import type { RankingContext } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1_000;

/** A fixed "now" injected into tests so results are deterministic. */
const FIXED_NOW = new Date('2026-07-01T12:00:00.000Z');

/** A seller context: the buyer is in Lagos Island. */
const BUYER_CONTEXT: RankingContext = {
  buyer_state: 'Lagos',
  buyer_city:  'Lagos Island',
};

/** ISO string 30 days after FIXED_NOW. */
const BOOST_END_30 = new Date(FIXED_NOW.getTime() + BOOST_DURATION_MS).toISOString();

// ─── Test suite 1: computeNewBoostEnd ────────────────────────────────────────

describe('(1) computeNewBoostEnd — first successful referral', () => {
  test('with no prior boost (null) → end is exactly NOW + 30 days', () => {
    const result = computeNewBoostEnd(null, FIXED_NOW);
    expect(result.getTime()).toBe(FIXED_NOW.getTime() + BOOST_DURATION_MS);
  });

  test('with an already-expired boost → end resets to NOW + 30 days', () => {
    const expiredEnd = new Date(FIXED_NOW.getTime() - 5 * DAY_MS); // 5 days ago
    const result = computeNewBoostEnd(expiredEnd, FIXED_NOW);
    expect(result.getTime()).toBe(FIXED_NOW.getTime() + BOOST_DURATION_MS);
  });
});

// ─── Test suite 2: ranking constraint — boosted unverified ≤ any verified ────

describe('(2) Boosted unverified seller never outranks any verified seller', () => {

  /**
   * The hardest case: an unverified seller in the buyer's exact same city,
   * with an active boost.  Even so, their effective band must be ≥ 4.
   * Any verified seller — even one in a different state — has band ≤ 3.
   */
  test('boosted unverified (same city) gets band 4; worst verified gets band 3', () => {
    const boostedUnverifiedSameCity = {
      verified_status: false,
      state:     'Lagos',
      city_area: 'Lagos Island',
      referral_boost_active_until: BOOST_END_30,
    };

    const worstVerified = {
      verified_status: true,
      state:     'Abuja',
      city_area: 'Garki',
      referral_boost_active_until: null,
    };

    const boostedBand  = computeRankBand(boostedUnverifiedSameCity, BUYER_CONTEXT);
    const verifiedBand = computeRankBand(worstVerified,             BUYER_CONTEXT);

    expect(boostedBand).toBe(4);   // floor for unverified
    expect(verifiedBand).toBe(3);  // worst verified band
    expect(boostedBand).toBeGreaterThan(verifiedBand); // verified still wins
  });

  test('every verified seller outranks a boosted unverified seller regardless of location', () => {
    const boostedUnverified = {
      verified_status: false,
      state:     'Rivers',
      city_area: 'Port Harcourt',
      referral_boost_active_until: BOOST_END_30,
    };

    const verifiedSellers = [
      { verified_status: true, state: 'Lagos',    city_area: 'Lagos Island', referral_boost_active_until: null }, // band 1
      { verified_status: true, state: 'Lagos',    city_area: 'Surulere',     referral_boost_active_until: null }, // band 2
      { verified_status: true, state: 'Abuja',    city_area: 'Garki',        referral_boost_active_until: null }, // band 3
    ];

    const unverifiedBand = computeRankBand(boostedUnverified, BUYER_CONTEXT);
    expect(unverifiedBand).toBeGreaterThanOrEqual(4);

    for (const v of verifiedSellers) {
      const vBand = computeRankBand(v, BUYER_CONTEXT);
      expect(vBand).toBeLessThanOrEqual(3);
      expect(unverifiedBand).toBeGreaterThan(vBand);
    }
  });

  test('applyBoostToBand never produces band < 4 for unverified sellers', () => {
    // All unverified base bands (4, 5, 6) with boost active
    expect(applyBoostToBand(4, false, true)).toBe(4); // floor, can't improve
    expect(applyBoostToBand(5, false, true)).toBe(4); // boost moves 5→4
    expect(applyBoostToBand(6, false, true)).toBe(5); // boost moves 6→5

    // All outputs are ≥ 4
    [4, 5, 6].forEach(band => {
      const result = applyBoostToBand(band, false, true);
      expect(result).toBeGreaterThanOrEqual(4);
    });
  });

  test('applyBoostToBand never produces band < 1 for verified sellers', () => {
    expect(applyBoostToBand(1, true, true)).toBe(1); // already best
    expect(applyBoostToBand(2, true, true)).toBe(1); // boost moves 2→1
    expect(applyBoostToBand(3, true, true)).toBe(2); // boost moves 3→2

    [1, 2, 3].forEach(band => {
      const result = applyBoostToBand(band, true, true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(3); // stays in verified range
    });
  });

  test('no boost leaves all bands unchanged', () => {
    [1, 2, 3, 4, 5, 6].forEach(band => {
      const isVerified = band <= 3;
      expect(applyBoostToBand(band, isVerified, false)).toBe(band);
    });
  });
});

// ─── Test suite 3: second referral extends date, not stacks ──────────────────

describe('(3) Second referral during active boost extends end date', () => {

  test('second referral with 15 days remaining → new end is 15 + 30 days from now', () => {
    const existingEnd = new Date(FIXED_NOW.getTime() + 15 * DAY_MS); // still active
    const result      = computeNewBoostEnd(existingEnd, FIXED_NOW);

    // Must extend FROM the existing end date, not from now
    const expected = existingEnd.getTime() + BOOST_DURATION_MS;
    expect(result.getTime()).toBe(expected);

    // Sanity: it's 45 days from now, not 30
    const daysFromNow = (result.getTime() - FIXED_NOW.getTime()) / DAY_MS;
    expect(daysFromNow).toBe(45);
  });

  test('second referral with 1 day remaining → end becomes 31 days from now', () => {
    const existingEnd = new Date(FIXED_NOW.getTime() + 1 * DAY_MS);
    const result      = computeNewBoostEnd(existingEnd, FIXED_NOW);

    const daysFromNow = (result.getTime() - FIXED_NOW.getTime()) / DAY_MS;
    expect(daysFromNow).toBe(31);
  });

  test('second referral after expired boost → starts fresh from now (+30 days)', () => {
    const expiredEnd = new Date(FIXED_NOW.getTime() - 3 * DAY_MS); // expired 3 days ago
    const result     = computeNewBoostEnd(expiredEnd, FIXED_NOW);

    expect(result.getTime()).toBe(FIXED_NOW.getTime() + BOOST_DURATION_MS);
  });

  test('result is always a single Date (not an array of boosts)', () => {
    // Call computeNewBoostEnd three times in sequence — simulates three
    // referrals. The result should always be one date, extending each time.
    let boostEnd: Date | null = null;
    boostEnd = computeNewBoostEnd(boostEnd, FIXED_NOW);                             // 1st
    boostEnd = computeNewBoostEnd(boostEnd, new Date(FIXED_NOW.getTime() + 5 * DAY_MS)); // 2nd (5 days later)
    boostEnd = computeNewBoostEnd(boostEnd, new Date(FIXED_NOW.getTime() + 20 * DAY_MS)); // 3rd (20 days later)

    // After 3 extensions from those points, result should be one date
    expect(boostEnd).toBeInstanceOf(Date);

    // First boost ends at FIXED_NOW + 30d
    // Second referral at +5d: end extends to (FIXED_NOW+30d) + 30d = FIXED_NOW+60d
    // Third referral at +20d: end is still FIXED_NOW+60d (active), extends to FIXED_NOW+90d
    const expected = new Date(FIXED_NOW.getTime() + 90 * DAY_MS);
    expect(boostEnd.getTime()).toBe(expected.getTime());
  });
});
