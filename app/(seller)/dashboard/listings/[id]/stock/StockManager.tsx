'use client';

import { useState } from 'react';

interface Variant {
  id: string;
  attributes: Record<string, string>;
  stock_count: number;
  is_available: boolean;
  low_stock_threshold: number | null;
}

interface StockEventRow {
  id: string;
  variant_id: string;
  change_type: string;
  quantity_delta: number;
  reason: string | null;
  date_created: string;
}

interface Props {
  listingId: string;
  variants: Variant[];
  events: StockEventRow[];
}

function variantLabel(v: Variant): string {
  const keys = Object.keys(v.attributes);
  if (keys.length === 0) return 'Default variant';
  return keys.map((k) => `${k}: ${v.attributes[k]}`).join(', ');
}

const CHANGE_TYPE_LABEL: Record<string, string> = {
  platform_sale:      'Sale',
  manual_adjustment:  'Adjustment',
  restock:            'Restock',
  offline_sale:       'Offline sale',
};

const CHANGE_TYPE_COLOR: Record<string, string> = {
  platform_sale:     '#C1542C',
  manual_adjustment: '#1B2A4A',
  restock:           '#2E7D32',
  offline_sale:      '#C1542C',
};

export default function StockManager({ listingId, variants: initialVariants, events: initialEvents }: Props) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [events, setEvents]     = useState<StockEventRow[]>(initialEvents);

  // Selected variant for restock / adjust forms
  const [selectedVid, setSelectedVid] = useState<string>(initialVariants[0]?.id ?? '');

  // Restock form
  const [restockQty, setRestockQty]       = useState('');
  const [restockState, setRestockState]   = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [restockError, setRestockError]   = useState('');

  // Adjust form
  const [adjustDelta, setAdjustDelta]     = useState('');
  const [adjustReason, setAdjustReason]   = useState('');
  const [adjustState, setAdjustState]     = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [adjustError, setAdjustError]     = useState('');

  async function refreshVariants() {
    const res = await fetch(`/api/listings/${listingId}/stock-history`);
    if (res.ok) {
      const data = await res.json();
      setVariants(data.variants ?? []);
      setEvents(data.events ?? []);
    }
  }

  async function handleRestock() {
    const qty = parseInt(restockQty, 10);
    if (!qty || qty <= 0) {
      setRestockError('Enter a positive quantity.');
      setRestockState('error');
      return;
    }
    setRestockState('loading');
    setRestockError('');
    const res = await fetch(
      `/api/listings/${listingId}/variants/${selectedVid}/restock`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      },
    );
    if (res.ok) {
      setRestockQty('');
      setRestockState('ok');
      setTimeout(() => setRestockState('idle'), 3000);
      await refreshVariants();
    } else {
      const data = await res.json().catch(() => ({}));
      setRestockError(data.error ?? 'Failed to restock.');
      setRestockState('error');
      setTimeout(() => setRestockState('idle'), 4000);
    }
  }

  async function handleAdjust() {
    const delta = parseInt(adjustDelta, 10);
    if (!adjustDelta || delta === 0 || isNaN(delta)) {
      setAdjustError('Enter a non-zero integer delta.');
      setAdjustState('error');
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError('Reason is required for manual adjustments.');
      setAdjustState('error');
      return;
    }
    setAdjustState('loading');
    setAdjustError('');
    const res = await fetch(
      `/api/listings/${listingId}/variants/${selectedVid}/adjust`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity_delta: delta, reason: adjustReason.trim() }),
      },
    );
    if (res.ok) {
      setAdjustDelta('');
      setAdjustReason('');
      setAdjustState('ok');
      setTimeout(() => setAdjustState('idle'), 3000);
      await refreshVariants();
    } else {
      const data = await res.json().catch(() => ({}));
      setAdjustError(data.error ?? 'Failed to adjust stock.');
      setAdjustState('error');
      setTimeout(() => setAdjustState('idle'), 4000);
    }
  }

  const selectedVariant = variants.find((v) => v.id === selectedVid) ?? variants[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Current stock table ─────────────────────────────────────── */}
      <section>
        <h2 style={sectionHeading}>Current Stock</h2>
        <div style={{ border: '1px solid rgba(27,42,74,0.1)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#F7F1E3' }}>
                <th style={th}>Variant</th>
                <th style={{ ...th, textAlign: 'right' }}>Stock</th>
                <th style={{ ...th, textAlign: 'right' }}>Alert threshold</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid rgba(27,42,74,0.07)' }}>
                  <td style={td}>{variantLabel(v)}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: v.stock_count === 0 ? '#C1542C' : '#1B2A4A' }}>
                    {v.stock_count}
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: '#8A7E66' }}>
                    {v.low_stock_threshold != null ? v.low_stock_threshold : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Variant selector (for actions) ─────────────────────────── */}
      {variants.length > 1 && (
        <div>
          <label style={labelStyle}>Acting on variant</label>
          <select
            value={selectedVid}
            onChange={(e) => setSelectedVid(e.target.value)}
            style={selectStyle}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>{variantLabel(v)} (stock: {v.stock_count})</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Restock form ────────────────────────────────────────────── */}
      <section style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 10, padding: '20px 24px' }}>
        <h2 style={sectionHeading}>Restock</h2>
        {selectedVariant && (
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 16px' }}>
            {variantLabel(selectedVariant)} — currently {selectedVariant.stock_count} in stock
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={labelStyle}>Quantity to add</label>
            <input
              type="number"
              min="1"
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
              placeholder="e.g. 20"
              style={inputStyle}
            />
          </div>
          <button
            onClick={handleRestock}
            disabled={restockState === 'loading'}
            style={{
              ...actionBtn,
              background: restockState === 'ok' ? '#2E7D32' : restockState === 'error' ? '#C1542C' : '#1B2A4A',
            }}
          >
            {restockState === 'loading' ? 'Saving…' :
             restockState === 'ok'      ? 'Restocked ✓' :
             restockState === 'error'   ? 'Error' :
             'Add Stock'}
          </button>
        </div>
        {restockError && (
          <p style={errorText}>{restockError}</p>
        )}
      </section>

      {/* ── Manual Adjustment form ──────────────────────────────────── */}
      <section style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 10, padding: '20px 24px' }}>
        <h2 style={sectionHeading}>Manual Adjustment</h2>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 16px' }}>
          Use this to correct inventory discrepancies (e.g. damaged items, offline sales).
          A reason is required.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 140px' }}>
              <label style={labelStyle}>Delta (+ or −)</label>
              <input
                type="number"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                placeholder="e.g. -2 or +5"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={labelStyle}>Reason (required)</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. 2 units damaged in storage"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <button
              onClick={handleAdjust}
              disabled={adjustState === 'loading'}
              style={{
                ...actionBtn,
                background: adjustState === 'ok' ? '#2E7D32' : adjustState === 'error' ? '#C1542C' : '#1B2A4A',
              }}
            >
              {adjustState === 'loading' ? 'Saving…' :
               adjustState === 'ok'      ? 'Adjusted ✓' :
               adjustState === 'error'   ? 'Error' :
               'Apply Adjustment'}
            </button>
          </div>
          {adjustError && (
            <p style={errorText}>{adjustError}</p>
          )}
        </div>
      </section>

      {/* ── Event History ───────────────────────────────────────────── */}
      <section>
        <h2 style={sectionHeading}>Stock History (last 50 events)</h2>
        {events.length === 0 ? (
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66' }}>
            No stock events yet.
          </p>
        ) : (
          <div style={{ border: '1px solid rgba(27,42,74,0.1)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F7F1E3' }}>
                  <th style={th}>Date</th>
                  <th style={th}>Type</th>
                  <th style={{ ...th, textAlign: 'right' }}>Delta</th>
                  <th style={th}>Reason / Note</th>
                  {variants.length > 1 && <th style={th}>Variant</th>}
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const variant = variants.find((v) => v.id === ev.variant_id);
                  return (
                    <tr key={ev.id} style={{ borderTop: '1px solid rgba(27,42,74,0.07)' }}>
                      <td style={{ ...td, color: '#8A7E66', whiteSpace: 'nowrap' }}>
                        {new Date(ev.date_created).toLocaleDateString('en-NG', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td style={td}>
                        <span style={{
                          fontWeight: 600,
                          color: CHANGE_TYPE_COLOR[ev.change_type] ?? '#1B2A4A',
                        }}>
                          {CHANGE_TYPE_LABEL[ev.change_type] ?? ev.change_type}
                        </span>
                      </td>
                      <td style={{
                        ...td, textAlign: 'right', fontWeight: 700,
                        color: ev.quantity_delta > 0 ? '#2E7D32' : '#C1542C',
                      }}>
                        {ev.quantity_delta > 0 ? `+${ev.quantity_delta}` : ev.quantity_delta}
                      </td>
                      <td style={{ ...td, color: '#8A7E66' }}>
                        {ev.reason ?? '—'}
                      </td>
                      {variants.length > 1 && (
                        <td style={{ ...td, color: '#8A7E66' }}>
                          {variant ? variantLabel(variant) : '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionHeading: React.CSSProperties = {
  fontFamily: "'Space Grotesk',sans-serif",
  fontWeight: 700,
  fontSize: 16,
  color: '#1B2A4A',
  margin: '0 0 16px',
};

const th: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontWeight: 600,
  fontSize: 12,
  color: '#8A7E66',
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
  padding: '10px 16px',
  textAlign: 'left' as const,
};

const td: React.CSSProperties = {
  padding: '10px 16px',
  color: '#1B2A4A',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 12,
  fontWeight: 600,
  color: '#8A7E66',
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid rgba(27,42,74,0.2)',
  borderRadius: 8,
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 14,
  color: '#1B2A4A',
  background: '#fff',
  boxSizing: 'border-box' as const,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid rgba(27,42,74,0.2)',
  borderRadius: 8,
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 14,
  color: '#1B2A4A',
  background: '#fff',
};

const actionBtn: React.CSSProperties = {
  padding: '10px 22px',
  borderRadius: 8,
  border: 'none',
  color: '#F7F1E3',
  fontFamily: "'Space Grotesk',sans-serif",
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
};

const errorText: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 13,
  color: '#C1542C',
  margin: '8px 0 0',
};
