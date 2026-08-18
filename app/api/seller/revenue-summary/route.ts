/**
 * GET /api/seller/revenue-summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns revenue, expense and profit summary for the authenticated seller
 * over the requested date range, plus per-listing/category breakdowns,
 * promotion impact, and the raw line items needed for export.
 *
 * All figures are self-reported / unverified — see disclaimer in response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';

export const DISCLAIMER =
  'IMPORTANT: These figures are self-reported by the seller and have not been independently ' +
  'verified by iBuyNaija. Platform Orders reflect a buyer\'s payment claim, not confirmed receipt ' +
  'of funds. Profit is an estimate only. This data is not an audited financial record.';

export async function GET(req: NextRequest) {
  const sellerId = await getSellerId();
  if (!sellerId) {
    return NextResponse.json({ error: 'Seller authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? '';
  const to   = searchParams.get('to')   ?? '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: 'from and to must be YYYY-MM-DD' }, { status: 400 });
  }

  const params = [sellerId, from, to] as const;

  const [
    totalsResult,
    breakdownListingResult,
    breakdownCatResult,
    promotionsResult,
    ordersResult,
    offlineSalesResult,
    expensesResult,
  ] = await Promise.all([
    // ── Totals ────────────────────────────────────────────────────────────────
    pool.query(
      `WITH
         platform AS (
           SELECT COALESCE(SUM(total), 0)::float   AS revenue,
                  COUNT(*)::int                    AS order_count
           FROM orders
           WHERE seller_id = $1 AND status = 'fulfilled'
             AND date_created::date BETWEEN $2::date AND $3::date
         ),
         offline AS (
           SELECT COALESCE(SUM(amount), 0)::float  AS revenue,
                  COUNT(*)::int                    AS sale_count
           FROM offline_sales
           WHERE seller_id = $1 AND date BETWEEN $2::date AND $3::date
         ),
         exp AS (
           SELECT COALESCE(SUM(amount), 0)::float  AS total_expenses,
                  COUNT(*)::int                    AS expense_count
           FROM expenses
           WHERE seller_id = $1 AND date BETWEEN $2::date AND $3::date
         )
       SELECT
         platform.revenue  AS platform_revenue,
         platform.order_count,
         offline.revenue   AS offline_revenue,
         offline.sale_count,
         exp.total_expenses,
         exp.expense_count,
         (platform.revenue + offline.revenue)                  AS total_revenue,
         (platform.revenue + offline.revenue - exp.total_expenses) AS profit
       FROM platform, offline, exp`,
      [...params],
    ),

    // ── Breakdown by listing ──────────────────────────────────────────────────
    pool.query(
      `WITH
         order_items AS (
           SELECT
             (item->>'listing_id')::uuid                                         AS listing_id,
             item->>'title'                                                       AS title,
             ((item->>'unit_price')::numeric * (item->>'qty')::int)::float       AS line_total
           FROM orders o
           CROSS JOIN LATERAL jsonb_array_elements(o.line_items) item
           WHERE o.seller_id = $1 AND o.status = 'fulfilled'
             AND o.date_created::date BETWEEN $2::date AND $3::date
         ),
         order_by_listing AS (
           SELECT listing_id, title,
                  SUM(line_total)::float AS platform_revenue
           FROM order_items
           GROUP BY listing_id, title
         ),
         offline_by_listing AS (
           SELECT os.listing_id, l.title,
                  SUM(os.amount)::float AS offline_revenue
           FROM offline_sales os
           JOIN listings l ON l.id = os.listing_id
           WHERE os.seller_id = $1
             AND os.date BETWEEN $2::date AND $3::date
             AND os.listing_id IS NOT NULL
           GROUP BY os.listing_id, l.title
         )
       SELECT
         COALESCE(obl.listing_id, ofl.listing_id)::text                  AS listing_id,
         COALESCE(obl.title, ofl.title)                                   AS title,
         COALESCE(obl.platform_revenue, 0)                                AS platform_revenue,
         COALESCE(ofl.offline_revenue,  0)                                AS offline_revenue,
         (COALESCE(obl.platform_revenue, 0) + COALESCE(ofl.offline_revenue, 0)) AS total_revenue
       FROM order_by_listing obl
       FULL OUTER JOIN offline_by_listing ofl USING (listing_id)
       ORDER BY total_revenue DESC`,
      [...params],
    ),

    // ── Breakdown by category ─────────────────────────────────────────────────
    pool.query(
      `WITH
         platform_by_cat AS (
           SELECT c.name AS category_name,
                  SUM(((item->>'unit_price')::numeric * (item->>'qty')::int))::float AS revenue
           FROM orders o
           CROSS JOIN LATERAL jsonb_array_elements(o.line_items) item
           JOIN listings l   ON l.id  = (item->>'listing_id')::uuid
           JOIN categories c ON c.id  = l.category_id
           WHERE o.seller_id = $1 AND o.status = 'fulfilled'
             AND o.date_created::date BETWEEN $2::date AND $3::date
           GROUP BY c.name
         ),
         offline_by_cat AS (
           SELECT c.name AS category_name,
                  SUM(os.amount)::float AS revenue
           FROM offline_sales os
           JOIN listings l   ON l.id  = os.listing_id
           JOIN categories c ON c.id  = l.category_id
           WHERE os.seller_id = $1
             AND os.date BETWEEN $2::date AND $3::date
             AND os.listing_id IS NOT NULL
           GROUP BY c.name
         )
       SELECT
         COALESCE(pbc.category_name, obc.category_name)       AS category_name,
         COALESCE(pbc.revenue, 0)                              AS platform_revenue,
         COALESCE(obc.revenue, 0)                              AS offline_revenue,
         (COALESCE(pbc.revenue, 0) + COALESCE(obc.revenue, 0)) AS total_revenue
       FROM platform_by_cat pbc
       FULL OUTER JOIN offline_by_cat obc USING (category_name)
       ORDER BY total_revenue DESC`,
      [...params],
    ),

    // ── Promotion impact ──────────────────────────────────────────────────────
    pool.query(
      `SELECT
         p.id, p.scope,
         p.listing_id::text,
         p.discount_type,
         p.discount_value::float,
         p.start_date::text,
         p.end_date::text,
         l.title AS listing_title,
         COALESCE((
           SELECT SUM(o.total)
           FROM orders o
           WHERE o.seller_id = $1 AND o.status = 'fulfilled'
             AND o.date_created BETWEEN
                 GREATEST(p.start_date, $2::date::timestamptz) AND
                 LEAST(p.end_date,     ($3::date + 1)::timestamptz)
             AND (
               p.scope = 'all_listings'
               OR EXISTS (
                 SELECT 1 FROM jsonb_array_elements(o.line_items) item
                 WHERE (item->>'listing_id')::uuid = p.listing_id
               )
             )
         ), 0)::float AS platform_sales,
         COALESCE((
           SELECT SUM(os.amount)
           FROM offline_sales os
           WHERE os.seller_id = $1
             AND os.date BETWEEN
                 GREATEST(p.start_date::date, $2::date) AND
                 LEAST(p.end_date::date,       $3::date)
             AND (p.scope = 'all_listings' OR os.listing_id = p.listing_id)
         ), 0)::float AS offline_sales
       FROM promotions p
       LEFT JOIN listings l ON l.id = p.listing_id
       WHERE p.seller_id = $1
         AND p.start_date <= ($3::date + 1)::timestamptz
         AND p.end_date   >=  $2::date::timestamptz
       ORDER BY p.start_date DESC`,
      [...params],
    ),

    // ── Fulfilled orders (for line-item export) ───────────────────────────────
    pool.query(
      `SELECT id, date_created::text AS date, total::float, line_items
       FROM orders
       WHERE seller_id = $1 AND status = 'fulfilled'
         AND date_created::date BETWEEN $2::date AND $3::date
       ORDER BY date_created DESC`,
      [...params],
    ),

    // ── Offline sales (for line-item export) ─────────────────────────────────
    pool.query(
      `SELECT os.id, os.date::text, os.amount::float, os.note,
              os.quantity, l.title AS listing_title
       FROM offline_sales os
       LEFT JOIN listings l ON l.id = os.listing_id
       WHERE os.seller_id = $1
         AND os.date BETWEEN $2::date AND $3::date
       ORDER BY os.date DESC, os.date_created DESC`,
      [...params],
    ),

    // ── Expenses (for line-item export) ──────────────────────────────────────
    pool.query(
      `SELECT id, date::text, amount::float, category, note
       FROM expenses
       WHERE seller_id = $1
         AND date BETWEEN $2::date AND $3::date
       ORDER BY date DESC, date_created DESC`,
      [...params],
    ),
  ]);

  const totals = totalsResult.rows[0];
  const promotions = promotionsResult.rows.map((p) => ({
    ...p,
    total_sales: p.platform_sales + p.offline_sales,
  }));

  return NextResponse.json({
    disclaimer: DISCLAIMER,
    period: { from, to },
    totals: {
      platform_revenue: totals.platform_revenue,
      offline_revenue:  totals.offline_revenue,
      total_revenue:    totals.total_revenue,
      total_expenses:   totals.total_expenses,
      profit:           totals.profit,
      order_count:      totals.order_count,
      sale_count:       totals.sale_count,
      expense_count:    totals.expense_count,
    },
    breakdown_by_listing:  breakdownListingResult.rows,
    breakdown_by_category: breakdownCatResult.rows,
    promotions,
    orders:        ordersResult.rows,
    offline_sales: offlineSalesResult.rows,
    expenses:      expensesResult.rows,
  });
}
