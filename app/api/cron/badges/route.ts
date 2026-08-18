/**
 * app/api/cron/badges/route.ts
 *
 * Daily badge recalculation job.
 *
 * Called by Vercel Cron (schedule in vercel.json).
 * Can also be triggered manually:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://ibuynaija.com/api/cron/badges
 *
 * Threshold values live in lib/badge-config.ts — edit there to tune.
 *
 * The two badge columns on sellers are computed independently:
 *   badge_top_seller — all-time order count + rating quality thresholds
 *   badge_trending   — top-N sellers by 7-day enquiry+order activity score
 *
 * Both UPDATEs run in a single transaction so the table is never in a
 * half-updated state.
 */

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { BADGE_CONFIG, LISTING_EXPIRY_DAYS } from '@/lib/badge-config';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get('authorization') ?? '';

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { topSeller, trending } = BADGE_CONFIG;

    // ── 1. Top Seller badge ───────────────────────────────────────────────────
    //
    // Awarded when ALL of the following hold for the seller:
    //   - fulfilled order count ≥ minFulfilledOrders
    //   - rating count         ≥ minRatingCount
    //   - avg((buying_experience + product_quality) / 2) ≥ minAvgRating
    //
    // The UPDATE touches every seller row (setting true or false), which is
    // intentional — a clean recompute on every run.

    await client.query(
      `UPDATE sellers
       SET
         badge_top_seller = (
           (
             SELECT COUNT(*)
             FROM   orders
             WHERE  seller_id = sellers.id
               AND  status    = 'fulfilled'
           ) >= $1
           AND
           (
             SELECT COUNT(*)
             FROM   ratings r
             JOIN   listings l ON l.id = r.listing_id
             WHERE  l.seller_id = sellers.id
           ) >= $2
           AND
           (
             SELECT (AVG(r.buying_experience_score) + AVG(r.product_quality_score)) / 2.0
             FROM   ratings r
             JOIN   listings l ON l.id = r.listing_id
             WHERE  l.seller_id = sellers.id
           ) >= $3
         ),
         badges_last_updated = NOW()`,
      [topSeller.minFulfilledOrders, topSeller.minRatingCount, topSeller.minAvgRating],
    );

    // ── 2. Trending badge ─────────────────────────────────────────────────────
    //
    // Awarded to the top-N sellers by activity score over the last windowDays.
    //   score = (distinct enquiries × enquiryWeight)
    //         + (distinct fulfilled orders × orderWeight)
    //
    // Sellers with score < minScore never qualify.
    // The subquery uses $3 * INTERVAL '1 day' to avoid string interpolation.

    await client.query(
      `UPDATE sellers
       SET badge_trending = (
         id IN (
           SELECT seller_id
           FROM (
             SELECT
               l.seller_id,
               COUNT(DISTINCT e.id) * $1
                 + COUNT(DISTINCT o.id) * $2  AS score
             FROM   listings l
             LEFT JOIN enquiries e
               ON  e.listing_id  = l.id
               AND e.date_created >= NOW() - $3 * INTERVAL '1 day'
             LEFT JOIN orders o
               ON  o.seller_id   = l.seller_id
               AND o.status      = 'fulfilled'
               AND o.date_updated >= NOW() - $3 * INTERVAL '1 day'
             WHERE l.status = 'active'
             GROUP BY l.seller_id
             HAVING
               COUNT(DISTINCT e.id) * $1
                 + COUNT(DISTINCT o.id) * $2  >= $4
             ORDER BY score DESC
             LIMIT $5
           ) qualified
         )
       )`,
      [
        trending.enquiryWeight,
        trending.orderWeight,
        trending.windowDays,
        trending.minScore,
        trending.topN,
      ],
    );

    // ── 3. Listing auto-expiry ────────────────────────────────────────────────
    //
    // Move active listings older than LISTING_EXPIRY_DAYS days to 'expired'.
    // Sellers can re-activate them from the dashboard.

    await client.query(
      `UPDATE listings
       SET status = 'expired'
       WHERE status = 'active'
         AND created_at < NOW() - $1 * INTERVAL '1 day'`,
      [LISTING_EXPIRY_DAYS],
    );

    // ── 4. Housekeeping ───────────────────────────────────────────────────────

    // Purge expired OTP tokens (stale rows are harmless but accumulate over time)
    await client.query(`DELETE FROM otp_tokens WHERE expires_at < NOW()`);

    // Clear expired referral boosts so the ranking SQL doesn't need to check dates
    await client.query(
      `UPDATE sellers SET referral_boost_active_until = NULL
       WHERE referral_boost_active_until IS NOT NULL
         AND referral_boost_active_until < NOW()`,
    );

    await client.query('COMMIT');

    return NextResponse.json({
      ok: true,
      recalculated_at: new Date().toISOString(),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[cron/badges] recalculation failed:', err);
    return NextResponse.json({ error: 'Recalculation failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
