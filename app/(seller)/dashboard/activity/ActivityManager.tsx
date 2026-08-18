'use client';

import { useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListingOption {
  id: string;
  title: string;
}

interface VariantOption {
  id: string;
  attributes: Record<string, string>;
  stock_count: number;
}

interface SaleRow {
  id: string;
  amount: number;
  date: string;
  note: string | null;
  listing_id: string | null;
  variant_id: string | null;
  quantity: number;
  date_created: string;
  listing_title: string | null;
  variant_attributes: Record<string, string> | null;
}

interface ExpenseRow {
  id: string;
  amount: number;
  date: string;
  category: string;
  note: string | null;
  date_created: string;
}

interface Props {
  listings: ListingOption[];
  initialSales: SaleRow[];
  initialExpenses: ExpenseRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNaira(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function variantLabel(attrs: Record<string, string> | null | undefined): string {
  if (!attrs || Object.keys(attrs).length === 0) return 'Default variant';
  return Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(', ');
}

type TabId = 'sales' | 'expenses';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActivityManager({ listings, initialSales, initialExpenses }: Props) {
  const [tab, setTab] = useState<TabId>('sales');
  const [sales, setSales]       = useState<SaleRow[]>(initialSales);
  const [expenses, setExpenses] = useState<ExpenseRow[]>(initialExpenses);

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '2px solid rgba(27,42,74,0.1)', marginBottom: 32, gap: 0 }}>
        {(['sales', 'expenses'] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontFamily: "'Space Grotesk',sans-serif",
              fontWeight: 700,
              fontSize: 14,
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              color: tab === t ? '#1B2A4A' : '#8A7E66',
              borderBottom: tab === t ? '2px solid #1B2A4A' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              letterSpacing: 0.3,
            }}
          >
            {t === 'sales' ? 'Offline Sales' : 'Expenses'}
          </button>
        ))}
      </div>

      {tab === 'sales' && (
        <SalesTab listings={listings} sales={sales} setSales={setSales} />
      )}
      {tab === 'expenses' && (
        <ExpensesTab expenses={expenses} setExpenses={setExpenses} />
      )}
    </div>
  );
}

// ─── Sales Tab ────────────────────────────────────────────────────────────────

function SalesTab({
  listings,
  sales,
  setSales,
}: {
  listings: ListingOption[];
  sales: SaleRow[];
  setSales: (s: SaleRow[]) => void;
}) {
  // Form state
  const [amount,      setAmount]      = useState('');
  const [date,        setDate]        = useState(today());
  const [note,        setNote]        = useState('');
  const [listingId,   setListingId]   = useState('');
  const [variants,    setVariants]    = useState<VariantOption[]>([]);
  const [variantId,   setVariantId]   = useState('');
  const [quantity,    setQuantity]    = useState('1');
  const [loadingV,    setLoadingV]    = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');

  // Edit state
  const [editId,      setEditId]      = useState<string | null>(null);
  const [editAmount,  setEditAmount]  = useState('');
  const [editDate,    setEditDate]    = useState('');
  const [editNote,    setEditNote]    = useState('');
  const [editState,   setEditState]   = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [editError,   setEditError]   = useState('');

  // Fetch variants when listing is selected
  useEffect(() => {
    if (!listingId) { setVariants([]); setVariantId(''); return; }
    setLoadingV(true);
    fetch(`/api/listings/${listingId}/variants`)
      .then((r) => r.json())
      .then((rows: VariantOption[]) => {
        setVariants(rows);
        // Auto-select if only one implicit variant
        if (rows.length === 1 && Object.keys(rows[0].attributes).length === 0) {
          setVariantId(rows[0].id);
        } else {
          setVariantId('');
        }
      })
      .catch(() => setVariants([]))
      .finally(() => setLoadingV(false));
  }, [listingId]);

  async function handleSubmit() {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setSubmitError('Enter a valid amount.');
      setSubmitState('error');
      return;
    }
    if (!date) {
      setSubmitError('Date is required.');
      setSubmitState('error');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setSubmitError('Quantity must be a positive number.');
      setSubmitState('error');
      return;
    }

    setSubmitState('loading');
    setSubmitError('');

    const res = await fetch('/api/offline-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amt,
        date,
        note: note.trim() || undefined,
        listing_id: listingId || undefined,
        variant_id: variantId || undefined,
        quantity: qty,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      // Prepend to list (fetch listing_title separately if needed, or rely on page refresh)
      const newSale: SaleRow = {
        ...data.sale,
        listing_title: listings.find((l) => l.id === data.sale.listing_id)?.title ?? null,
        variant_attributes: variants.find((v) => v.id === data.sale.variant_id)?.attributes ?? null,
      };
      setSales([newSale, ...sales]);
      setAmount(''); setNote(''); setListingId(''); setVariantId('');
      setVariants([]); setQuantity('1');
      setSubmitState('ok');
      setTimeout(() => setSubmitState('idle'), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setSubmitError(data.error ?? 'Failed to save. Please try again.');
      setSubmitState('error');
      setTimeout(() => setSubmitState('idle'), 4000);
    }
  }

  function startEdit(sale: SaleRow) {
    setEditId(sale.id);
    setEditAmount(sale.amount.toString());
    setEditDate(sale.date);
    setEditNote(sale.note ?? '');
    setEditState('idle');
    setEditError('');
  }

  async function handleEdit(saleId: string) {
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      setEditError('Enter a valid amount.');
      setEditState('error');
      return;
    }
    setEditState('loading');
    setEditError('');
    const res = await fetch(`/api/offline-sales/${saleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt, date: editDate, note: editNote.trim() || null }),
    });
    if (res.ok) {
      setSales(sales.map((s) =>
        s.id === saleId ? { ...s, amount: amt, date: editDate, note: editNote.trim() || null } : s,
      ));
      setEditId(null);
      setEditState('idle');
    } else {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error ?? 'Failed to save.');
      setEditState('error');
      setTimeout(() => setEditState('idle'), 4000);
    }
  }

  async function handleDelete(saleId: string) {
    const res = await fetch(`/api/offline-sales/${saleId}`, { method: 'DELETE' });
    if (res.ok) {
      setSales(sales.filter((s) => s.id !== saleId));
    }
  }

  const selectedVariant = variants.find((v) => v.id === variantId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* ── Log Sale Form ─────────────────────────────────────────── */}
      <section style={cardStyle}>
        <h2 style={sectionH2}>Log Offline Sale</h2>
        <p style={hintText}>
          Record a sale that happened in-person, via referral, or through any channel outside iBuyNaija.
          <strong> Self-reported — not verified by iBuyNaija.</strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Amount + Date row */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={labelStyle}>Amount (₦) <span style={{ color: '#C1542C' }}>*</span></label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 15000"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={labelStyle}>Date <span style={{ color: '#C1542C' }}>*</span></label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Listing picker */}
          <div>
            <label style={labelStyle}>Linked listing (optional)</label>
            <select
              value={listingId}
              onChange={(e) => { setListingId(e.target.value); setVariantId(''); }}
              style={selectStyle}
            >
              <option value="">— No listing (freestanding sale) —</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
            <p style={{ ...hintText, marginTop: 6, marginBottom: 0 }}>
              {listingId
                ? 'Selecting a variant below will reduce that variant\'s stock count.'
                : 'Leave blank for items not listed on the platform — no inventory effect.'}
            </p>
          </div>

          {/* Variant picker (appears when listing selected) */}
          {listingId && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Variant (optional)</label>
                {loadingV ? (
                  <p style={{ ...hintText, margin: 0 }}>Loading variants…</p>
                ) : (
                  <select
                    value={variantId}
                    onChange={(e) => setVariantId(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">— No variant selected —</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {variantLabel(v.attributes)} (stock: {v.stock_count})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {variantId && (
                <div style={{ flex: '0 0 100px' }}>
                  <label style={labelStyle}>Qty sold <span style={{ color: '#C1542C' }}>*</span></label>
                  <input
                    type="number"
                    min="1"
                    max={selectedVariant?.stock_count ?? 999}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div>
            <label style={labelStyle}>Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Sold at Balogun market"
              style={inputStyle}
            />
          </div>

          <div>
            <button
              onClick={handleSubmit}
              disabled={submitState === 'loading'}
              style={{
                ...actionBtn,
                background: submitState === 'ok' ? '#2E7D32' : submitState === 'error' ? '#C1542C' : '#C1542C',
              }}
            >
              {submitState === 'loading' ? 'Saving…' :
               submitState === 'ok'      ? 'Sale logged ✓' :
               'Log Sale'}
            </button>
            {submitError && <p style={errorText}>{submitError}</p>}
          </div>
        </div>
      </section>

      {/* ── Sales List ───────────────────────────────────────────── */}
      <section>
        <h2 style={sectionH2}>Logged Sales</h2>
        {sales.length === 0 ? (
          <p style={{ ...hintText, margin: 0 }}>No offline sales logged yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sales.map((sale) => (
              <div key={sale.id}>
                {editId === sale.id ? (
                  /* ── inline edit ── */
                  <div style={{ ...cardStyle, background: '#F7F1E3' }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                      <div style={{ flex: '1 1 140px' }}>
                        <label style={labelStyle}>Amount (₦)</label>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ flex: '1 1 140px' }}>
                        <label style={labelStyle}>Date</label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ flex: '2 1 200px' }}>
                        <label style={labelStyle}>Note</label>
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                    {sale.listing_title && (
                      <p style={{ ...hintText, margin: '0 0 12px' }}>
                        Linked listing: <strong>{sale.listing_title}</strong>
                        {sale.variant_attributes && ` — ${variantLabel(sale.variant_attributes)}`}
                        {' '}(cannot be changed — delete and re-log to update)
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleEdit(sale.id)}
                        disabled={editState === 'loading'}
                        style={{ ...actionBtn, background: '#1B2A4A', fontSize: 13, padding: '8px 16px' }}
                      >
                        {editState === 'loading' ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        style={{ ...ghostBtn }}
                      >
                        Cancel
                      </button>
                    </div>
                    {editError && <p style={errorText}>{editError}</p>}
                  </div>
                ) : (
                  /* ── row display ── */
                  <div style={{ ...cardStyle, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#2E7D32' }}>
                          {formatNaira(sale.amount)}
                        </span>
                        <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
                          {sale.date}
                        </span>
                        {sale.quantity > 1 && (
                          <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>
                            qty: {sale.quantity}
                          </span>
                        )}
                      </div>
                      {sale.listing_title && (
                        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A', marginBottom: 2 }}>
                          {sale.listing_title}
                          {sale.variant_attributes && ` — ${variantLabel(sale.variant_attributes)}`}
                        </div>
                      )}
                      {sale.note && (
                        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
                          {sale.note}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => startEdit(sale)} style={ghostBtn}>Edit</button>
                      <button onClick={() => handleDelete(sale.id)} style={{ ...ghostBtn, color: '#C1542C', borderColor: 'rgba(193,84,44,0.25)' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

function ExpensesTab({
  expenses,
  setExpenses,
}: {
  expenses: ExpenseRow[];
  setExpenses: (e: ExpenseRow[]) => void;
}) {
  const [amount,      setAmount]      = useState('');
  const [date,        setDate]        = useState(today());
  const [category,    setCategory]    = useState('');
  const [note,        setNote]        = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');

  const [editId,       setEditId]       = useState<string | null>(null);
  const [editAmount,   setEditAmount]   = useState('');
  const [editDate,     setEditDate]     = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNote,     setEditNote]     = useState('');
  const [editState,    setEditState]    = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [editError,    setEditError]    = useState('');

  async function handleSubmit() {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setSubmitError('Enter a valid amount.'); setSubmitState('error'); return;
    }
    if (!date) {
      setSubmitError('Date is required.'); setSubmitState('error'); return;
    }
    if (!category.trim()) {
      setSubmitError('Category is required.'); setSubmitState('error'); return;
    }
    setSubmitState('loading'); setSubmitError('');

    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt, date, category: category.trim(), note: note.trim() || undefined }),
    });

    if (res.ok) {
      const data = await res.json();
      setExpenses([data.expense, ...expenses]);
      setAmount(''); setCategory(''); setNote('');
      setSubmitState('ok');
      setTimeout(() => setSubmitState('idle'), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setSubmitError(data.error ?? 'Failed to save.'); setSubmitState('error');
      setTimeout(() => setSubmitState('idle'), 4000);
    }
  }

  function startEdit(exp: ExpenseRow) {
    setEditId(exp.id);
    setEditAmount(exp.amount.toString());
    setEditDate(exp.date);
    setEditCategory(exp.category);
    setEditNote(exp.note ?? '');
    setEditState('idle'); setEditError('');
  }

  async function handleEdit(expId: string) {
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      setEditError('Enter a valid amount.'); setEditState('error'); return;
    }
    if (!editCategory.trim()) {
      setEditError('Category is required.'); setEditState('error'); return;
    }
    setEditState('loading'); setEditError('');

    const res = await fetch(`/api/expenses/${expId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt, date: editDate, category: editCategory.trim(), note: editNote.trim() || null }),
    });

    if (res.ok) {
      setExpenses(expenses.map((e) =>
        e.id === expId
          ? { ...e, amount: amt, date: editDate, category: editCategory.trim(), note: editNote.trim() || null }
          : e,
      ));
      setEditId(null); setEditState('idle');
    } else {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error ?? 'Failed to save.'); setEditState('error');
      setTimeout(() => setEditState('idle'), 4000);
    }
  }

  async function handleDelete(expId: string) {
    const res = await fetch(`/api/expenses/${expId}`, { method: 'DELETE' });
    if (res.ok) setExpenses(expenses.filter((e) => e.id !== expId));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* ── Log Expense Form ─────────────────────────────────────── */}
      <section style={cardStyle}>
        <h2 style={sectionH2}>Log Expense</h2>
        <p style={hintText}>
          Track business costs — packaging, delivery, raw materials, market fees, etc.
          <strong> Self-reported — not verified by iBuyNaija.</strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={labelStyle}>Amount (₦) <span style={{ color: '#C1542C' }}>*</span></label>
              <input
                type="number" min="0.01" step="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 3500" style={inputStyle}
              />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={labelStyle}>Date <span style={{ color: '#C1542C' }}>*</span></label>
              <input
                type="date" value={date}
                onChange={(e) => setDate(e.target.value)} style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Category <span style={{ color: '#C1542C' }}>*</span></label>
            <input
              type="text" value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Packaging, Delivery, Raw materials, Market fees"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Note (optional)</label>
            <input
              type="text" value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 50 poly bags from Alaba market"
              style={inputStyle}
            />
          </div>

          <div>
            <button
              onClick={handleSubmit}
              disabled={submitState === 'loading'}
              style={{
                ...actionBtn,
                background: submitState === 'ok' ? '#2E7D32' : '#1B2A4A',
              }}
            >
              {submitState === 'loading' ? 'Saving…' :
               submitState === 'ok'      ? 'Expense logged ✓' :
               'Log Expense'}
            </button>
            {submitError && <p style={errorText}>{submitError}</p>}
          </div>
        </div>
      </section>

      {/* ── Expenses List ─────────────────────────────────────────── */}
      <section>
        <h2 style={sectionH2}>Logged Expenses</h2>
        {expenses.length === 0 ? (
          <p style={{ ...hintText, margin: 0 }}>No expenses logged yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {expenses.map((exp) => (
              <div key={exp.id}>
                {editId === exp.id ? (
                  <div style={{ ...cardStyle, background: '#F7F1E3' }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                      <div style={{ flex: '1 1 130px' }}>
                        <label style={labelStyle}>Amount (₦)</label>
                        <input type="number" value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)} style={inputStyle} />
                      </div>
                      <div style={{ flex: '1 1 130px' }}>
                        <label style={labelStyle}>Date</label>
                        <input type="date" value={editDate}
                          onChange={(e) => setEditDate(e.target.value)} style={inputStyle} />
                      </div>
                      <div style={{ flex: '2 1 180px' }}>
                        <label style={labelStyle}>Category</label>
                        <input type="text" value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)} style={inputStyle} />
                      </div>
                      <div style={{ flex: '2 1 180px' }}>
                        <label style={labelStyle}>Note</label>
                        <input type="text" value={editNote}
                          onChange={(e) => setEditNote(e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleEdit(exp.id)}
                        disabled={editState === 'loading'}
                        style={{ ...actionBtn, background: '#1B2A4A', fontSize: 13, padding: '8px 16px' }}
                      >
                        {editState === 'loading' ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setEditId(null)} style={ghostBtn}>Cancel</button>
                    </div>
                    {editError && <p style={errorText}>{editError}</p>}
                  </div>
                ) : (
                  <div style={{ ...cardStyle, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#C1542C' }}>
                          {formatNaira(exp.amount)}
                        </span>
                        <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
                          {exp.date}
                        </span>
                        <span style={{
                          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, fontWeight: 600,
                          background: 'rgba(27,42,74,0.06)', color: '#1B2A4A',
                          padding: '2px 8px', borderRadius: 4,
                        }}>
                          {exp.category}
                        </span>
                      </div>
                      {exp.note && (
                        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
                          {exp.note}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => startEdit(exp)} style={ghostBtn}>Edit</button>
                      <button onClick={() => handleDelete(exp.id)} style={{ ...ghostBtn, color: '#C1542C', borderColor: 'rgba(193,84,44,0.25)' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid rgba(27,42,74,0.1)',
  borderRadius: 10,
  padding: '20px 24px',
};

const sectionH2: React.CSSProperties = {
  fontFamily: "'Space Grotesk',sans-serif",
  fontWeight: 700,
  fontSize: 16,
  color: '#1B2A4A',
  margin: '0 0 8px',
};

const hintText: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 13,
  color: '#8A7E66',
  margin: '0 0 16px',
  lineHeight: 1.5,
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
};

const ghostBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid rgba(27,42,74,0.2)',
  background: 'transparent',
  color: '#1B2A4A',
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 13,
  cursor: 'pointer',
};

const errorText: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 13,
  color: '#C1542C',
  margin: '8px 0 0',
};
