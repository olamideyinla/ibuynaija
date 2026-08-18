'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Totals {
  platform_revenue: number;
  offline_revenue: number;
  total_revenue: number;
  total_expenses: number;
  profit: number;
  order_count: number;
  sale_count: number;
  expense_count: number;
}

interface BreakdownListing {
  listing_id: string | null;
  title: string;
  platform_revenue: number;
  offline_revenue: number;
  total_revenue: number;
}

interface BreakdownCategory {
  category_name: string;
  platform_revenue: number;
  offline_revenue: number;
  total_revenue: number;
}

interface Promotion {
  id: string;
  scope: string;
  listing_id: string | null;
  listing_title: string | null;
  discount_type: string;
  discount_value: number;
  start_date: string;
  end_date: string;
  platform_sales: number;
  offline_sales: number;
  total_sales: number;
}

interface Order {
  id: string;
  date: string;
  total: number;
  line_items: Array<{ listing_id: string; title: string; qty: number; unit_price: number }>;
}

interface OfflineSale {
  id: string;
  date: string;
  amount: number;
  quantity: number;
  listing_title: string | null;
  note: string | null;
}

interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  note: string | null;
}

interface SummaryData {
  period: { from: string; to: string };
  totals: Totals;
  breakdown_by_listing: BreakdownListing[];
  breakdown_by_category: BreakdownCategory[];
  promotions: Promotion[];
  orders: Order[];
  offline_sales: OfflineSale[];
  expenses: Expense[];
}

type Preset = 'today' | 'week' | 'month' | 'last_month' | 'custom';
type BreakdownView = 'listing' | 'category';
type DetailView = 'breakdown' | 'promotions' | 'lines' | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getPresetRange(preset: Exclude<Preset, 'custom'>): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: fmt(now), to: fmt(now) };
    case 'week': {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return { from: fmt(monday), to: fmt(now) };
    }
    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(first), to: fmt(now) };
    }
    case 'last_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last  = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(first), to: fmt(last) };
    }
  }
}

function naira(n: number): string {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function promoLabel(p: Promotion): string {
  const val = p.discount_type === 'percentage'
    ? `${p.discount_value}% off`
    : `${naira(p.discount_value)} off`;
  return p.listing_title ? `${val} — ${p.listing_title}` : `${val} (all listings)`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RevenueDashboard() {
  const [preset,      setPreset]      = useState<Preset>('month');
  const [customFrom,  setCustomFrom]  = useState('');
  const [customTo,    setCustomTo]    = useState('');
  const [data,        setData]        = useState<SummaryData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [breakdown,   setBreakdown]   = useState<BreakdownView>('listing');
  const [detail,      setDetail]      = useState<DetailView>(null);

  // Compute the active date range
  const range = useCallback((): { from: string; to: string } | null => {
    if (preset === 'custom') {
      if (!customFrom || !customTo) return null;
      return { from: customFrom, to: customTo };
    }
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  // Fetch summary data
  const fetchData = useCallback(async () => {
    const r = range();
    if (!r) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/seller/revenue-summary?from=${r.from}&to=${r.to}`);
      if (!res.ok) throw new Error('Failed to load summary');
      setData(await res.json());
    } catch {
      setError('Could not load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const r = range();

  function downloadCSV() {
    if (!r) return;
    window.location.href = `/api/seller/revenue-export?from=${r.from}&to=${r.to}`;
  }

  function openPrint() {
    if (!r) return;
    window.open(`/dashboard/revenue/print?from=${r.from}&to=${r.to}`, '_blank', 'noopener,noreferrer');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Period controls ────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 10, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(['today', 'week', 'month', 'last_month', 'custom'] as Preset[]).map((p) => {
            const labels: Record<Preset, string> = {
              today: 'Today', week: 'This Week', month: 'This Month',
              last_month: 'Last Month', custom: 'Custom',
            };
            return (
              <button
                key={p}
                onClick={() => setPreset(p)}
                style={{
                  fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 13,
                  padding: '7px 14px', borderRadius: 7,
                  border: preset === p ? 'none' : '1px solid rgba(27,42,74,0.2)',
                  background: preset === p ? '#1B2A4A' : 'transparent',
                  color: preset === p ? '#F7F1E3' : '#1B2A4A',
                  cursor: 'pointer',
                }}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {preset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={inputSm}
            />
            <span style={{ color: '#8A7E66', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13 }}>to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={inputSm}
            />
          </div>
        )}

        {r && (
          <div style={{ marginTop: 8, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>
            {fmtDate(r.from)} — {fmtDate(r.to)}
          </div>
        )}
      </div>

      {/* ── Loading / error states ─────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66' }}>
          Loading…
        </div>
      )}

      {error && (
        <div style={{ padding: '14px 18px', background: 'rgba(193,84,44,0.08)', borderRadius: 8,
          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#C1542C' }}>
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── Summary cards ─────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <SummaryCard
              label="Revenue (estimate)"
              value={naira(data.totals.total_revenue)}
              sub={`Platform ₦${data.totals.platform_revenue.toLocaleString('en-NG', { maximumFractionDigits: 0 })} + Offline ₦${data.totals.offline_revenue.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`}
              accent="#2E7D32"
            />
            <SummaryCard
              label="Expenses (self-reported)"
              value={naira(data.totals.total_expenses)}
              sub={`${data.totals.expense_count} item${data.totals.expense_count !== 1 ? 's' : ''}`}
              accent="#C1542C"
            />
            <SummaryCard
              label="Estimated Profit"
              value={naira(data.totals.profit)}
              sub="Revenue − Expenses (unverified estimate)"
              accent={data.totals.profit >= 0 ? '#1B2A4A' : '#C1542C'}
              disclaimer
            />
          </div>

          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>
            {data.totals.order_count} fulfilled platform order{data.totals.order_count !== 1 ? 's' : ''} ·{' '}
            {data.totals.sale_count} offline sale{data.totals.sale_count !== 1 ? 's' : ''} ·{' '}
            Orders attributed by creation date, not fulfillment date.
          </div>

          {/* ── Section toggle bar ────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(
              [
                ['breakdown', 'Revenue Breakdown'],
                ['promotions', 'Promotion Impact'],
                ['lines', 'Line Items'],
              ] as [DetailView, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setDetail(detail === id ? null : id)}
                style={{
                  fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 13,
                  padding: '7px 14px', borderRadius: 7,
                  border: '1px solid rgba(27,42,74,0.2)',
                  background: detail === id ? '#F7F1E3' : 'transparent',
                  color: '#1B2A4A', cursor: 'pointer',
                }}
              >
                {label} {detail === id ? '▲' : '▼'}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={downloadCSV} style={exportBtn}>⬇ CSV</button>
              <button onClick={openPrint} style={exportBtn}>⎙ Print / PDF</button>
            </div>
          </div>

          {/* ── Revenue breakdown ─────────────────────────────────────── */}
          {detail === 'breakdown' && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <h2 style={sectionH2}>Revenue Breakdown</h2>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['listing', 'category'] as BreakdownView[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setBreakdown(v)}
                      style={{
                        fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 12,
                        padding: '5px 12px', borderRadius: 6,
                        border: '1px solid rgba(27,42,74,0.2)',
                        background: breakdown === v ? '#1B2A4A' : 'transparent',
                        color: breakdown === v ? '#F7F1E3' : '#1B2A4A', cursor: 'pointer',
                      }}
                    >
                      By {v === 'listing' ? 'Listing' : 'Category'}
                    </button>
                  ))}
                </div>
              </div>

              {breakdown === 'listing' && (
                data.breakdown_by_listing.length === 0
                  ? <p style={emptyText}>No revenue in this period.</p>
                  : <BreakdownTable rows={data.breakdown_by_listing.map((r) => ({
                      label: r.title,
                      platform: r.platform_revenue,
                      offline: r.offline_revenue,
                      total: r.total_revenue,
                    }))} />
              )}

              {breakdown === 'category' && (
                data.breakdown_by_category.length === 0
                  ? <p style={emptyText}>No revenue in this period.</p>
                  : <BreakdownTable rows={data.breakdown_by_category.map((r) => ({
                      label: r.category_name,
                      platform: r.platform_revenue,
                      offline: r.offline_revenue,
                      total: r.total_revenue,
                    }))} />
              )}
            </div>
          )}

          {/* ── Promotion impact ─────────────────────────────────────── */}
          {detail === 'promotions' && (
            <div style={cardStyle}>
              <h2 style={sectionH2}>Promotion Impact</h2>
              <p style={hintStyle}>
                Sales recorded during each promotion&apos;s active window (overlapping the selected period).
                High sales during a promo don&apos;t confirm the discount drove them — use this as a rough indicator only.
              </p>
              {data.promotions.length === 0
                ? <p style={emptyText}>No promotions overlapping this period.</p>
                : (
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ background: '#F7F1E3' }}>
                        <th style={th}>Promotion</th>
                        <th style={th}>Window</th>
                        <th style={{ ...th, textAlign: 'right' }}>Sales during promo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.promotions.map((p) => (
                        <tr key={p.id} style={{ borderTop: '1px solid rgba(27,42,74,0.07)' }}>
                          <td style={td}>{promoLabel(p)}</td>
                          <td style={{ ...td, color: '#8A7E66', fontSize: 12 }}>
                            {fmtDate(p.start_date)} – {fmtDate(p.end_date)}
                          </td>
                          <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                            {naira(p.total_sales)}
                            {p.total_sales === 0 && (
                              <span style={{ fontWeight: 400, color: '#8A7E66', fontSize: 12 }}> (no sales logged)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}

          {/* ── Line items ───────────────────────────────────────────── */}
          {detail === 'lines' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Platform orders */}
              <div style={cardStyle}>
                <h2 style={sectionH2}>Platform Orders (fulfilled)</h2>
                {data.orders.length === 0
                  ? <p style={emptyText}>No fulfilled orders in this period.</p>
                  : (
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ background: '#F7F1E3' }}>
                          <th style={th}>Order</th>
                          <th style={th}>Date</th>
                          <th style={th}>Items</th>
                          <th style={{ ...th, textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.orders.map((o) => (
                          <tr key={o.id} style={{ borderTop: '1px solid rgba(27,42,74,0.07)' }}>
                            <td style={{ ...td, fontFamily: "'Space Grotesk',sans-serif", fontSize: 12 }}>
                              #{o.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td style={{ ...td, color: '#8A7E66', fontSize: 12, whiteSpace: 'nowrap' }}>
                              {fmtDate(o.date.slice(0, 10))}
                            </td>
                            <td style={{ ...td, fontSize: 12 }}>
                              {o.line_items.map((i) => `${i.title} ×${i.qty}`).join(', ')}
                            </td>
                            <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                              {naira(o.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>

              {/* Offline sales */}
              <div style={cardStyle}>
                <h2 style={sectionH2}>Offline Sales (self-reported)</h2>
                {data.offline_sales.length === 0
                  ? <p style={emptyText}>No offline sales in this period.</p>
                  : (
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ background: '#F7F1E3' }}>
                          <th style={th}>Date</th>
                          <th style={th}>Linked listing</th>
                          <th style={th}>Note</th>
                          <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.offline_sales.map((s) => (
                          <tr key={s.id} style={{ borderTop: '1px solid rgba(27,42,74,0.07)' }}>
                            <td style={{ ...td, color: '#8A7E66', fontSize: 12, whiteSpace: 'nowrap' }}>{s.date}</td>
                            <td style={{ ...td, fontSize: 12 }}>{s.listing_title ?? '—'}</td>
                            <td style={{ ...td, fontSize: 12, color: '#8A7E66' }}>{s.note ?? '—'}</td>
                            <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{naira(s.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>

              {/* Expenses */}
              <div style={cardStyle}>
                <h2 style={sectionH2}>Expenses (self-reported)</h2>
                {data.expenses.length === 0
                  ? <p style={emptyText}>No expenses in this period.</p>
                  : (
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ background: '#F7F1E3' }}>
                          <th style={th}>Date</th>
                          <th style={th}>Category</th>
                          <th style={th}>Note</th>
                          <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.expenses.map((e) => (
                          <tr key={e.id} style={{ borderTop: '1px solid rgba(27,42,74,0.07)' }}>
                            <td style={{ ...td, color: '#8A7E66', fontSize: 12, whiteSpace: 'nowrap' }}>{e.date}</td>
                            <td style={{ ...td, fontSize: 12 }}>
                              <span style={{
                                background: 'rgba(27,42,74,0.06)', color: '#1B2A4A',
                                padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                              }}>
                                {e.category}
                              </span>
                            </td>
                            <td style={{ ...td, fontSize: 12, color: '#8A7E66' }}>{e.note ?? '—'}</td>
                            <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#C1542C' }}>
                              {naira(e.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, accent, disclaimer,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
  disclaimer?: boolean;
}) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(27,42,74,0.1)',
      borderRadius: 10,
      padding: '18px 22px',
    }}>
      <div style={{
        fontFamily: "'Hanken Grotesk',sans-serif",
        fontSize: 12, fontWeight: 600, color: '#8A7E66',
        textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Space Grotesk',sans-serif",
        fontWeight: 700, fontSize: 26, color: accent, lineHeight: 1,
        marginBottom: 6,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: "'Hanken Grotesk',sans-serif",
        fontSize: 12, color: '#8A7E66',
      }}>
        {sub}
        {disclaimer && (
          <span style={{ display: 'block', marginTop: 4, color: 'rgba(193,84,44,0.8)' }}>
            * Estimate — not a verified figure
          </span>
        )}
      </div>
    </div>
  );
}

function BreakdownTable({
  rows,
}: {
  rows: Array<{ label: string; platform: number; offline: number; total: number }>;
}) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A' }}>
              {r.label}
            </span>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: '#1B2A4A' }}>
              {naira(r.total)}
            </span>
          </div>
          {/* Stacked bar: platform vs offline */}
          <div style={{ height: 8, borderRadius: 4, background: '#F0EBE0', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${(r.platform / max) * 100}%`, background: '#1B2A4A', borderRadius: '4px 0 0 4px' }} />
            <div style={{ width: `${(r.offline / max) * 100}%`, background: '#C1542C' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            {r.platform > 0 && (
              <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#1B2A4A' }}>
                ■ Platform {naira(r.platform)}
              </span>
            )}
            {r.offline > 0 && (
              <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#C1542C' }}>
                ■ Offline {naira(r.offline)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(27,42,74,0.1)',
  borderRadius: 10,
  padding: '20px 24px',
};

const sectionH2: React.CSSProperties = {
  fontFamily: "'Space Grotesk',sans-serif",
  fontWeight: 700, fontSize: 16, color: '#1B2A4A', margin: '0 0 4px',
};

const hintStyle: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 13, color: '#8A7E66', margin: '0 0 16px', lineHeight: 1.5,
};

const emptyText: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 14, color: '#8A7E66', margin: 0,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 14,
};

const th: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontWeight: 600, fontSize: 11,
  color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 0.5,
  padding: '8px 12px', textAlign: 'left',
};

const td: React.CSSProperties = {
  padding: '10px 12px',
  color: '#1B2A4A',
};

const inputSm: React.CSSProperties = {
  padding: '7px 10px',
  border: '1.5px solid rgba(27,42,74,0.2)',
  borderRadius: 7,
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 13,
  color: '#1B2A4A',
  background: '#fff',
};

const exportBtn: React.CSSProperties = {
  fontFamily: "'Space Grotesk',sans-serif",
  fontWeight: 700, fontSize: 13,
  padding: '7px 16px', borderRadius: 7,
  border: '1px solid rgba(27,42,74,0.2)',
  background: 'transparent',
  color: '#1B2A4A', cursor: 'pointer',
};
