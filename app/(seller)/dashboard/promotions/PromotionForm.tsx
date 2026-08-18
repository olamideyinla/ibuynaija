'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Listing {
  id: string;
  title: string;
}

interface Props {
  listings: Listing[];
}

const LABEL: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  color: '#1B2A4A',
  display: 'block',
  marginBottom: 6,
};
const INPUT: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: '1px solid rgba(27,42,74,0.2)',
  borderRadius: 8,
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 14,
  color: '#1B2A4A',
  background: '#fff',
  outline: 'none',
};
const FIELD: React.CSSProperties = { marginBottom: 20 };

export default function PromotionForm({ listings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [scope,         setScope]         = useState<'single_listing' | 'all_listings'>('single_listing');
  const [listingId,     setListingId]     = useState(listings[0]?.id ?? '');
  const [discountType,  setDiscountType]  = useState<'percentage' | 'fixed_amount'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [startDate,     setStartDate]     = useState('');
  const [endDate,       setEndDate]       = useState('');
  const [error,         setError]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      setError('Discount value must be a positive number.');
      return;
    }
    if (discountType === 'percentage' && val > 100) {
      setError('Percentage discount cannot exceed 100.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start and end dates are required.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after start date.');
      return;
    }

    startTransition(async () => {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          listing_id: scope === 'single_listing' ? listingId : null,
          discount_type: discountType,
          discount_value: val,
          start_date: new Date(startDate).toISOString(),
          end_date:   new Date(endDate).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to create promotion.');
        return;
      }
      router.push('/dashboard/promotions');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Scope */}
      <div style={FIELD}>
        <label style={LABEL}>Applies to</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {(['single_listing', 'all_listings'] as const).map((s) => (
            <label
              key={s}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#1B2A4A',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="scope"
                value={s}
                checked={scope === s}
                onChange={() => setScope(s)}
              />
              {s === 'single_listing' ? 'One listing' : 'All my listings'}
            </label>
          ))}
        </div>
      </div>

      {/* Listing picker */}
      {scope === 'single_listing' && (
        <div style={FIELD}>
          <label style={LABEL}>Listing</label>
          {listings.length === 0 ? (
            <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#C1542C' }}>
              You have no active listings to promote.
            </p>
          ) : (
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              required
              style={INPUT}
            >
              {listings.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Discount type */}
      <div style={FIELD}>
        <label style={LABEL}>Discount type</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {([
            ['percentage',  'Percentage (%)'],
            ['fixed_amount', 'Fixed amount (₦)'],
          ] as const).map(([val, label]) => (
            <label
              key={val}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#1B2A4A',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="discount_type"
                value={val}
                checked={discountType === val}
                onChange={() => setDiscountType(val)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Discount value */}
      <div style={FIELD}>
        <label style={LABEL}>
          {discountType === 'percentage' ? 'Discount percentage (e.g. 20 for 20% off)' : 'Discount amount in ₦ (e.g. 500)'}
        </label>
        <input
          type="number"
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
          min={0.01}
          max={discountType === 'percentage' ? 100 : undefined}
          step="any"
          required
          placeholder={discountType === 'percentage' ? '20' : '500'}
          style={INPUT}
        />
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={LABEL}>Start date &amp; time</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            style={INPUT}
          />
        </div>
        <div>
          <label style={LABEL}>End date &amp; time</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            style={INPUT}
          />
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(193,84,44,0.08)', border: '1px solid rgba(193,84,44,0.3)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 20,
          fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: '#C1542C',
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || (scope === 'single_listing' && listings.length === 0)}
        style={{
          background: '#1B2A4A', color: '#F7F1E3',
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15,
          padding: '12px 28px', borderRadius: 8, border: 'none',
          cursor: isPending ? 'wait' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? 'Creating…' : 'Create promotion'}
      </button>
    </form>
  );
}
