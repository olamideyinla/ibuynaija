/**
 * lib/promotions.ts
 *
 * Single source of truth for promotion price calculations.
 *
 * THE FORMULA (used in JS AND mirrored exactly in effectivePriceSql):
 *   percentage   → MAX(0, price × (1 − value/100))
 *   fixed_amount → MAX(0, price − value)
 *
 * Usage pattern:
 *   1. Add ACTIVE_PROMO_LATERAL to any SQL query that needs promotion data.
 *   2. Call applyPromotion(basePrice, row) in React components / API handlers.
 *   3. Use effectivePriceSql() for server-side totals that must be computed in SQL
 *      (cart totals stored in orders, checkout line_items).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromoInfo {
  promo_id: string;
  promo_discount_type: 'percentage' | 'fixed_amount';
  promo_discount_value: number;
  promo_end_date: string;
}

// ─── JS helper ────────────────────────────────────────────────────────────────

/**
 * Returns the effective (post-discount) price, or null when:
 *   - basePrice is null / undefined (quote-only listing), OR
 *   - promo is null / undefined (no active promotion).
 *
 * Returns null (not basePrice) in both cases so callers can distinguish
 * "has a promotion" from "no promotion" unambiguously.
 */
export function applyPromotion(
  basePrice: number | null | undefined,
  promo: Pick<PromoInfo, 'promo_discount_type' | 'promo_discount_value'> | null | undefined,
): number | null {
  if (basePrice == null || promo == null) return null;
  const base = Number(basePrice);
  const val  = Number(promo.promo_discount_value);
  if (promo.promo_discount_type === 'percentage') {
    return Math.max(0, base * (1 - Math.min(100, Math.max(0, val)) / 100));
  }
  return Math.max(0, base - val);
}

// ─── SQL helpers ──────────────────────────────────────────────────────────────

/**
 * SQL LATERAL subquery that finds the single best active promotion for a
 * listing row.  Listing-specific promotions take precedence over seller-wide.
 *
 * @param listingAlias SQL alias for the `listings` table (default 'l')
 *
 * Always use as:  LEFT JOIN ... ON TRUE
 * Columns exposed: promo_id, promo_discount_type, promo_discount_value, promo_end_date
 * All are NULL when no promotion is active.
 */
export const ACTIVE_PROMO_LATERAL = (listingAlias = 'l') => `
LEFT JOIN LATERAL (
  SELECT
    p.id                AS promo_id,
    p.discount_type     AS promo_discount_type,
    p.discount_value    AS promo_discount_value,
    p.end_date          AS promo_end_date
  FROM promotions p
  WHERE (
      (p.scope = 'single_listing' AND p.listing_id = ${listingAlias}.id)
   OR (p.scope = 'all_listings'   AND p.seller_id  = ${listingAlias}.seller_id)
  )
    AND NOW() BETWEEN p.start_date AND p.end_date
  ORDER BY (p.scope = 'single_listing') DESC, p.end_date ASC
  LIMIT 1
) promo ON TRUE`;

/**
 * SQL CASE expression that mirrors applyPromotion() exactly.
 * Assumes ACTIVE_PROMO_LATERAL has already been joined as `promo`.
 *
 * @param basePriceExpr SQL expression for the base price,
 *   e.g. 'l.price' or 'COALESCE(lv.price_override, l.price)'
 */
export function effectivePriceSql(basePriceExpr: string): string {
  return `(CASE
    WHEN promo.promo_id IS NOT NULL AND (${basePriceExpr}) IS NOT NULL
    THEN CASE
      WHEN promo.promo_discount_type = 'percentage'
        THEN GREATEST(0, (${basePriceExpr}) * (1 - promo.promo_discount_value / 100))
      ELSE
        GREATEST(0, (${basePriceExpr}) - promo.promo_discount_value)
    END
    ELSE (${basePriceExpr})
  END)`;
}
