/**
 * /dashboard/revenue/print?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Opens a clean, print-optimised page with the disclaimer text printed directly
 * on the document (spec §3.5b requirement). Browser File → Print → Save as PDF
 * produces the PDF artifact.
 *
 * The page auto-triggers window.print() on load via PrintTrigger.
 */

import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { SELLER_COOKIE } from '@/lib/cookie';
import { pool } from '@/lib/db';
import { DISCLAIMER } from '@/app/api/seller/revenue-summary/route';
import PrintTrigger from './PrintTrigger';

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

function naira(n: number): string {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}

const thSt: React.CSSProperties = {
  background: '#f0ebe0',
  padding: '8px 10px',
  fontWeight: 600,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#8A7E66',
};

export default async function PrintPage({ searchParams }: PageProps) {
  const store    = await cookies();
  const sellerId = store.get(SELLER_COOKIE)?.value ?? null;
  if (!sellerId) redirect('/login');

  const { from, to } = await searchParams;
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    notFound();
  }

  const p = [sellerId, from, to] as const;

  const [sellerRes, totalsRes, ordersRes, offlineRes, expensesRes, promoRes] = await Promise.all([
    pool.query(`SELECT business_name FROM sellers WHERE id = $1`, [sellerId]),

    pool.query(
      `WITH
         plat AS (SELECT COALESCE(SUM(total),0)::float AS rev, COUNT(*)::int AS oc FROM orders WHERE seller_id=$1 AND status='fulfilled' AND date_created::date BETWEEN $2::date AND $3::date),
         offl AS (SELECT COALESCE(SUM(amount),0)::float AS rev, COUNT(*)::int AS sc FROM offline_sales WHERE seller_id=$1 AND date BETWEEN $2::date AND $3::date),
         exp  AS (SELECT COALESCE(SUM(amount),0)::float AS e, COUNT(*)::int AS ec FROM expenses WHERE seller_id=$1 AND date BETWEEN $2::date AND $3::date)
       SELECT plat.rev AS plat_rev, plat.oc, offl.rev AS offl_rev, offl.sc,
              exp.e AS exp_total, exp.ec,
              (plat.rev+offl.rev) AS total_rev, (plat.rev+offl.rev-exp.e) AS profit
       FROM plat,offl,exp`,
      [...p],
    ),

    pool.query(
      `SELECT id, date_created::text AS date, total::float, line_items
       FROM orders WHERE seller_id=$1 AND status='fulfilled' AND date_created::date BETWEEN $2::date AND $3::date ORDER BY date_created`,
      [...p],
    ),

    pool.query(
      `SELECT os.date::text, os.amount::float, os.quantity, os.note, l.title AS listing_title
       FROM offline_sales os LEFT JOIN listings l ON l.id=os.listing_id WHERE os.seller_id=$1 AND os.date BETWEEN $2::date AND $3::date ORDER BY os.date`,
      [...p],
    ),

    pool.query(
      `SELECT date::text, amount::float, category, note FROM expenses WHERE seller_id=$1 AND date BETWEEN $2::date AND $3::date ORDER BY date`,
      [...p],
    ),

    pool.query(
      `SELECT p.scope, l.title AS listing_title, p.discount_type, p.discount_value::float,
              p.start_date::text, p.end_date::text,
              COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.seller_id=$1 AND o.status='fulfilled' AND o.date_created BETWEEN GREATEST(p.start_date,$2::date::timestamptz) AND LEAST(p.end_date,($3::date+1)::timestamptz) AND (p.scope='all_listings' OR EXISTS(SELECT 1 FROM jsonb_array_elements(o.line_items) item WHERE (item->>'listing_id')::uuid=p.listing_id))),0)::float AS plat_sales,
              COALESCE((SELECT SUM(os.amount) FROM offline_sales os WHERE os.seller_id=$1 AND os.date BETWEEN GREATEST(p.start_date::date,$2::date) AND LEAST(p.end_date::date,$3::date) AND (p.scope='all_listings' OR os.listing_id=p.listing_id)),0)::float AS offl_sales
       FROM promotions p LEFT JOIN listings l ON l.id=p.listing_id WHERE p.seller_id=$1 AND p.start_date<=($3::date+1)::timestamptz AND p.end_date>=$2::date::timestamptz ORDER BY p.start_date DESC`,
      [...p],
    ),
  ]);

  const businessName: string = sellerRes.rows[0]?.business_name ?? 'Seller';
  const t = totalsRes.rows[0];
  const orders   = ordersRes.rows;
  const offline  = offlineRes.rows;
  const expenses = expensesRes.rows;
  const promos   = promoRes.rows;

  const generatedAt = new Date().toLocaleString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <>
      {/* Scoped styles — override root layout body bg and set print-page layout */}
      <style>{`
        body { background: #fff !important; }
        .rp * { box-sizing: border-box; margin: 0; padding: 0; }
        .rp { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1B2A4A; background: #fff; padding: 32px; max-width: 900px; margin: 0 auto; }
        .rp h1 { font-size: 22px; font-weight: 700; color: #1B2A4A; margin-bottom: 4px; }
        .rp h2 { font-size: 15px; font-weight: 700; color: #1B2A4A; margin: 28px 0 10px; }
        .rp table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .rp td, .rp th { text-align: left; }
        .rp .disclaimer-box { background: #fff3e8; border: 1.5px solid #c1542c; border-radius: 8px; padding: 14px 18px; margin: 16px 0 24px; }
        .rp .disclaimer-label { font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #c1542c; margin-bottom: 6px; }
        .rp .disclaimer-text { font-size: 12px; color: #7a3317; line-height: 1.55; }
        .rp .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
        .rp .summary-card { border: 1px solid #e8e2d8; border-radius: 8px; padding: 14px 16px; }
        .rp .summary-label { font-size: 11px; font-weight: 600; color: #8A7E66; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .rp .summary-value { font-size: 22px; font-weight: 700; }
        .rp .summary-sub { font-size: 11px; color: #8A7E66; margin-top: 4px; }
        @media print {
          nav, header { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .rp { padding: 16px; font-size: 11px; }
          .rp h1 { font-size: 18px; }
          .rp .summary-value { font-size: 18px; }
        }
      `}</style>

      <div className="rp">
        <PrintTrigger />

        {/* ── Header ─────────────────────────────────────────────────── */}
        <h1>Revenue &amp; Expense Summary</h1>
        <p style={{ fontSize: 13, color: '#8A7E66', marginBottom: 4 }}>{businessName}</p>
        <p style={{ fontSize: 12, color: '#8A7E66' }}>
          Period: <strong>{fmtDate(from)}</strong> — <strong>{fmtDate(to)}</strong>
          &nbsp;&nbsp;·&nbsp;&nbsp;Generated: {generatedAt}
        </p>

        {/* ── MANDATORY DISCLAIMER — printed on document ────────────── */}
        <div className="disclaimer-box">
          <div className="disclaimer-label">⚠ Disclaimer — Read Before Using These Figures</div>
          <div className="disclaimer-text">{DISCLAIMER}</div>
        </div>

        {/* ── Summary ────────────────────────────────────────────────── */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-label">Revenue (estimate)</div>
            <div className="summary-value" style={{ color: '#2E7D32' }}>{naira(t.total_rev)}</div>
            <div className="summary-sub">
              Platform {naira(t.plat_rev)} ({t.oc} orders)<br />
              Offline {naira(t.offl_rev)} ({t.sc} sales)
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Expenses (self-reported)</div>
            <div className="summary-value" style={{ color: '#C1542C' }}>{naira(t.exp_total)}</div>
            <div className="summary-sub">{t.ec} item{t.ec !== 1 ? 's' : ''}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Estimated Profit *</div>
            <div className="summary-value" style={{ color: t.profit >= 0 ? '#1B2A4A' : '#C1542C' }}>{naira(t.profit)}</div>
            <div className="summary-sub">* Unverified estimate</div>
          </div>
        </div>

        {/* ── Platform Orders ───────────────────────────────────────── */}
        <h2>Platform Orders (status: fulfilled)</h2>
        <table>
          <thead><tr>
            <th style={thSt}>Order ID</th>
            <th style={thSt}>Date</th>
            <th style={thSt}>Items</th>
            <th style={{ ...thSt, textAlign: 'right' }}>Total</th>
          </tr></thead>
          <tbody>
            {orders.length === 0
              ? <tr><td colSpan={4} style={{ padding: '10px', color: '#8A7E66' }}>No fulfilled orders in this period.</td></tr>
              : orders.map((o) => {
                  const items = (o.line_items as Array<{ title: string; qty: number; unit_price: number }>)
                    .map((i) => `${i.title} ×${i.qty}`).join(', ');
                  return (
                    <tr key={o.id}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8', fontSize: 11, fontFamily: 'monospace' }}>
                        #{o.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8', color: '#8A7E66', whiteSpace: 'nowrap' }}>
                        {o.date.slice(0, 10)}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8' }}>{items}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8', textAlign: 'right', fontWeight: 700 }}>
                        {naira(o.total)}
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>

        {/* ── Offline Sales ─────────────────────────────────────────── */}
        <h2>Offline Sales (self-reported — not verified by iBuyNaija)</h2>
        <table>
          <thead><tr>
            {(['Date', 'Amount', 'Qty', 'Linked Listing', 'Note'] as const).map((h, i) => (
              <th key={i} style={{ ...thSt, textAlign: i === 1 ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {offline.length === 0
              ? <tr><td colSpan={5} style={{ padding: '10px', color: '#8A7E66' }}>No offline sales in this period.</td></tr>
              : offline.map((s, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8', color: '#8A7E66', whiteSpace: 'nowrap' }}>{s.date}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8', textAlign: 'right', fontWeight: 700 }}>{naira(s.amount)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8', textAlign: 'center' }}>{s.quantity}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8' }}>{s.listing_title ?? '—'}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8', color: '#8A7E66' }}>{s.note ?? ''}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {/* ── Expenses ──────────────────────────────────────────────── */}
        <h2>Expenses (self-reported — not verified by iBuyNaija)</h2>
        <table>
          <thead><tr>
            {(['Date', 'Amount', 'Category', 'Note'] as const).map((h, i) => (
              <th key={i} style={{ ...thSt, textAlign: i === 1 ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {expenses.length === 0
              ? <tr><td colSpan={4} style={{ padding: '10px', color: '#8A7E66' }}>No expenses in this period.</td></tr>
              : expenses.map((e, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8', color: '#8A7E66', whiteSpace: 'nowrap' }}>{e.date}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8', textAlign: 'right', fontWeight: 700, color: '#C1542C' }}>{naira(e.amount)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8' }}>{e.category}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8', color: '#8A7E66' }}>{e.note ?? ''}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {/* ── Promotion Impact ──────────────────────────────────────── */}
        {promos.length > 0 && (
          <>
            <h2>Promotion Impact (during period)</h2>
            <table>
              <thead><tr>
                {(['Promotion', 'Window', 'Sales during promo'] as const).map((h, i) => (
                  <th key={i} style={{ ...thSt, textAlign: i === 2 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {promos.map((promo, i) => {
                  const label = promo.discount_type === 'percentage'
                    ? `${promo.discount_value}% off`
                    : `₦${promo.discount_value.toLocaleString()} off`;
                  return (
                    <tr key={i}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8' }}>
                        {label}{promo.listing_title ? ` — ${promo.listing_title}` : ' (all listings)'}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8', color: '#8A7E66', whiteSpace: 'nowrap', fontSize: 11 }}>
                        {promo.start_date.slice(0, 10)} – {promo.end_date.slice(0, 10)}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e2d8', textAlign: 'right', fontWeight: 700 }}>
                        {naira(promo.plat_sales + promo.offl_sales)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* ── Footer disclaimer ─────────────────────────────────────── */}
        <div style={{ marginTop: 40, borderTop: '1px solid #e8e2d8', paddingTop: 16 }}>
          <div className="disclaimer-box">
            <div className="disclaimer-label">⚠ Disclaimer (repeated for clarity)</div>
            <div className="disclaimer-text">{DISCLAIMER}</div>
          </div>
          <p style={{ fontSize: 11, color: '#8A7E66', marginTop: 8 }}>
            Generated by iBuyNaija (ibuynaija.com) · {generatedAt}
          </p>
        </div>
      </div>
    </>
  );
}
