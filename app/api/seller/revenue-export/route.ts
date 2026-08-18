/**
 * GET /api/seller/revenue-export?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Generates a downloadable CSV containing revenue/expense line items
 * for the authenticated seller over the requested date range.
 *
 * The disclaimer required by spec §3.5b is embedded directly in the CSV
 * as the first content row — it is not in a tooltip or separate help page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSellerId } from '@/lib/cookie';
import { DISCLAIMER } from '../revenue-summary/route';

function esc(v: unknown): string {
  const s = v == null ? '' : String(v);
  // RFC 4180: wrap in quotes if the field contains comma, quote, or newline
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(...cells: unknown[]): string {
  return cells.map(esc).join(',');
}

function naira(n: number): string {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function GET(req: NextRequest) {
  const sellerId = await getSellerId();
  if (!sellerId) {
    return new NextResponse('Seller authentication required', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? '';
  const to   = searchParams.get('to')   ?? '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return new NextResponse('from and to must be YYYY-MM-DD', { status: 400 });
  }

  // Fetch seller business name
  const { rows: [seller] } = await pool.query(
    `SELECT business_name FROM sellers WHERE id = $1`,
    [sellerId],
  );
  const businessName: string = seller?.business_name ?? 'Unknown seller';

  const p = [sellerId, from, to] as const;

  // Run all queries in parallel
  const [totalsRes, ordersRes, offlineRes, expensesRes] = await Promise.all([
    pool.query(
      `WITH
         platform AS (SELECT COALESCE(SUM(total),0)::float AS rev, COUNT(*)::int AS oc FROM orders WHERE seller_id=$1 AND status='fulfilled' AND date_created::date BETWEEN $2::date AND $3::date),
         offline  AS (SELECT COALESCE(SUM(amount),0)::float AS rev, COUNT(*)::int AS sc FROM offline_sales WHERE seller_id=$1 AND date BETWEEN $2::date AND $3::date),
         exp      AS (SELECT COALESCE(SUM(amount),0)::float AS exp, COUNT(*)::int AS ec FROM expenses WHERE seller_id=$1 AND date BETWEEN $2::date AND $3::date)
       SELECT platform.rev AS platform_revenue, platform.oc AS order_count,
              offline.rev  AS offline_revenue,  offline.sc  AS sale_count,
              exp.exp AS total_expenses, exp.ec AS expense_count,
              (platform.rev + offline.rev) AS total_revenue,
              (platform.rev + offline.rev - exp.exp) AS profit
       FROM platform, offline, exp`,
      [...p],
    ),
    pool.query(
      `SELECT id, date_created::text AS date, total::float, line_items
       FROM orders WHERE seller_id=$1 AND status='fulfilled' AND date_created::date BETWEEN $2::date AND $3::date ORDER BY date_created DESC`,
      [...p],
    ),
    pool.query(
      `SELECT os.id, os.date::text, os.amount::float, os.quantity, os.note, l.title AS listing_title
       FROM offline_sales os LEFT JOIN listings l ON l.id=os.listing_id WHERE os.seller_id=$1 AND os.date BETWEEN $2::date AND $3::date ORDER BY os.date DESC`,
      [...p],
    ),
    pool.query(
      `SELECT id, date::text, amount::float, category, note FROM expenses WHERE seller_id=$1 AND date BETWEEN $2::date AND $3::date ORDER BY date DESC`,
      [...p],
    ),
  ]);

  const t  = totalsRes.rows[0];
  const lines: string[] = [];

  const generatedAt = new Date().toLocaleString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // ── Document header + MANDATORY DISCLAIMER ────────────────────────────────
  lines.push(row('REVENUE & EXPENSE SUMMARY REPORT'));
  lines.push(row('Seller', businessName));
  lines.push(row('Period', `${from} to ${to}`));
  lines.push(row('Generated', generatedAt));
  lines.push('');
  lines.push(row('⚠ DISCLAIMER'));
  lines.push(row(DISCLAIMER));
  lines.push('');

  // ── Summary ───────────────────────────────────────────────────────────────
  lines.push(row('SUMMARY'));
  lines.push(row('Revenue — Platform Orders (fulfilled)', naira(t.platform_revenue), `(${t.order_count} order${t.order_count !== 1 ? 's' : ''})`));
  lines.push(row('Revenue — Offline Sales (self-reported)', naira(t.offline_revenue), `(${t.sale_count} sale${t.sale_count !== 1 ? 's' : ''})`));
  lines.push(row('Total Revenue (estimate)', naira(t.total_revenue)));
  lines.push(row('Total Expenses (self-reported)', naira(t.total_expenses), `(${t.expense_count} item${t.expense_count !== 1 ? 's' : ''})`));
  lines.push(row('Estimated Profit', naira(t.profit)));
  lines.push('');

  // ── Platform Orders ───────────────────────────────────────────────────────
  lines.push(row('PLATFORM ORDERS (status: fulfilled)'));
  lines.push(row('Order ID', 'Date', 'Order Total', 'Items'));

  for (const o of ordersRes.rows) {
    const itemSummary = (o.line_items as Array<{ title: string; qty: number; unit_price: number }>)
      .map((i) => `${i.title} ×${i.qty} @${naira(i.unit_price)}`)
      .join('; ');
    lines.push(row(o.id.slice(0, 8).toUpperCase(), o.date.slice(0, 10), naira(o.total), itemSummary));
  }

  if (ordersRes.rows.length === 0) lines.push(row('(no fulfilled orders in this period)'));
  lines.push('');

  // ── Offline Sales ─────────────────────────────────────────────────────────
  lines.push(row('OFFLINE SALES (self-reported — not verified by iBuyNaija)'));
  lines.push(row('Date', 'Amount', 'Qty', 'Linked Listing', 'Note'));

  for (const s of offlineRes.rows) {
    lines.push(row(s.date, naira(s.amount), s.quantity, s.listing_title ?? '—', s.note ?? ''));
  }

  if (offlineRes.rows.length === 0) lines.push(row('(no offline sales in this period)'));
  lines.push('');

  // ── Expenses ──────────────────────────────────────────────────────────────
  lines.push(row('EXPENSES (self-reported — not verified by iBuyNaija)'));
  lines.push(row('Date', 'Amount', 'Category', 'Note'));

  for (const e of expensesRes.rows) {
    lines.push(row(e.date, naira(e.amount), e.category, e.note ?? ''));
  }

  if (expensesRes.rows.length === 0) lines.push(row('(no expenses in this period)'));
  lines.push('');

  // ── Footer ────────────────────────────────────────────────────────────────
  lines.push(row('─'));
  lines.push(row('This report was generated by iBuyNaija (ibuynaija.com).'));
  lines.push(row(DISCLAIMER));

  const csv = lines.join('\r\n');
  const filename = `ibuynaija-revenue-${from}-to-${to}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
