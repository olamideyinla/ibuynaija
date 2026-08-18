/**
 * lib/badge-config.ts
 *
 * Threshold values for the automatic activity badges.
 * This is the single place to tune badge criteria — no logic lives here,
 * only numbers.  The cron job at app/api/cron/badges/route.ts imports these
 * constants and builds its SQL from them.
 *
 * Changes take effect on the next cron run after deployment.
 */

export const BADGE_CONFIG = {
  /**
   * "Top Seller" badge (deep green ★)
   *
   * Awarded to sellers who meet ALL three thresholds simultaneously.
   * Recalculated once daily.
   */
  topSeller: {
    /** Minimum fulfilled orders all-time. */
    minFulfilledOrders: 20,

    /**
     * Minimum combined average of buying_experience_score and
     * product_quality_score (each scored 1–5).
     */
    minAvgRating: 4.5,

    /**
     * Minimum number of ratings before the average is trusted.
     * Prevents a single 5-star rating from granting the badge.
     */
    minRatingCount: 3,
  },

  /**
   * "Trending This Week" badge (terracotta ↑)
   *
   * Awarded to the top N sellers by combined activity score in the last
   * `windowDays` days.  A seller with a score of zero never qualifies,
   * regardless of topN.
   *
   * score = (enquiries in window × enquiryWeight)
   *       + (fulfilled orders in window × orderWeight)
   *
   * Recalculated once daily.
   */
  trending: {
    /** Maximum simultaneous badge holders. */
    topN: 10,

    /** Look-back window in days. */
    windowDays: 7,

    /** Points per enquiry. */
    enquiryWeight: 1,

    /** Points per fulfilled order (weighted higher because it signals conversion). */
    orderWeight: 3,

    /** Minimum score to qualify (excludes zero-activity sellers). */
    minScore: 1,
  },
} as const;

/**
 * Number of days after which an active listing is automatically expired.
 * The cron job at app/api/cron/badges/route.ts applies this.
 */
export const LISTING_EXPIRY_DAYS = 90;
