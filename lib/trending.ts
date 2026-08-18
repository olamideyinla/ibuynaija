/**
 * lib/trending.ts
 *
 * Trending score computation for the homepage.
 *
 * Formula: engagement_score = (enquiry_count × 1) + (order_count × 3)
 * Window: last 30 days.
 *
 * The trending section uses the same 6-band ranking as category/search pages.
 */

/**
 * SQL fragment that computes the engagement score for each listing
 * within the last 30 days. Used in the homepage trending query.
 *
 * Intended to be used as a subquery:
 *
 *   LEFT JOIN (${trendingScoreSubquery()}) eng ON eng.listing_id = l.id
 */
export function trendingScoreSubquery(): string {
  return `
    SELECT
      l_inner.id AS listing_id,
      COALESCE(COUNT(DISTINCT e.id), 0)
        + COALESCE(COUNT(DISTINCT oi.order_id), 0) * 3 AS score
    FROM listings l_inner
    LEFT JOIN enquiries e
      ON e.listing_id = l_inner.id
     AND e.date_created > NOW() - INTERVAL '30 days'
    LEFT JOIN (
      SELECT
        (item ->> 'listing_id') AS listing_id_str,
        o.id AS order_id
      FROM orders o
      CROSS JOIN LATERAL jsonb_array_elements(o.line_items) AS item
      WHERE o.date_created > NOW() - INTERVAL '30 days'
        AND o.status <> 'cancelled'
    ) oi ON oi.listing_id_str = l_inner.id::text
    GROUP BY l_inner.id
  `.trim();
}
