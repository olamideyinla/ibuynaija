'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NIGERIAN_STATES } from '@/lib/nigerian-states';

interface SellerGroup {
  sellerId: string;
  sellerName: string;
  itemCount: number;
  subtotal: number;
  deliveryZones: Record<string, number>;
}

interface Props {
  sellerGroups: SellerGroup[];
  grandTotal: number;
  savedAddresses?: string[];
}

function lookupFee(zones: Record<string, number>, state: string): number | null {
  if (state in zones) return zones[state];
  if ('__default__' in zones) return zones['__default__'];
  return null;
}

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function CheckoutForm({ sellerGroups, grandTotal, savedAddresses = [] }: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryState, setDeliveryState] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Compute per-seller fees when delivery method is delivery and state is selected
  const showFees = deliveryMethod === 'delivery' && deliveryState !== '';
  const feesBySeller = sellerGroups.map(g => ({
    sellerId: g.sellerId,
    sellerName: g.sellerName,
    subtotal: g.subtotal,
    fee: showFees ? lookupFee(g.deliveryZones, deliveryState) : null,
  }));
  const deliveryTotal = showFees
    ? feesBySeller.reduce((sum, s) => sum + (s.fee ?? 0), 0)
    : 0;
  const grandTotalWithDelivery = grandTotal + deliveryTotal;

  // Map sellerId → fee for sending to API
  const deliveryFeesMap: Record<string, number> = {};
  if (showFees) {
    for (const s of feesBySeller) {
      if (s.fee !== null) deliveryFeesMap[s.sellerId] = s.fee;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          email: email || undefined,
          delivery_method: deliveryMethod,
          delivery_address: deliveryMethod === 'delivery' ? address : undefined,
          delivery_state:   deliveryMethod === 'delivery' && deliveryState ? deliveryState : undefined,
          delivery_fees:    deliveryMethod === 'delivery' && showFees ? deliveryFeesMap : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Checkout failed. Please try again.');
        setLoading(false);
        return;
      }

      // Navigate to the first order
      router.push(`/orders/${data.orders[0].id}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  const nairaTotal = fmt(grandTotalWithDelivery);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Phone */}
      <div>
        <label
          htmlFor="checkout-phone"
          style={labelStyle}
        >
          Phone Number <span style={{ color: '#C1542C' }}>*</span>
        </label>
        <input
          id="checkout-phone"
          type="tel"
          placeholder="08012345678"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Email (optional) */}
      <div>
        <label
          htmlFor="checkout-email"
          style={labelStyle}
        >
          Email <span style={{ color: '#8A7E66', fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          id="checkout-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Delivery method */}
      <div>
        <div style={labelStyle}>
          Delivery Method <span style={{ color: '#C1542C' }}>*</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {(['delivery', 'pickup'] as const).map((m) => (
            <label
              key={m}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderRadius: 10,
                border: `2px solid ${deliveryMethod === m ? '#1B2A4A' : 'rgba(27,42,74,0.2)'}`,
                cursor: 'pointer',
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 14,
                color: '#1B2A4A',
                background: deliveryMethod === m ? 'rgba(27,42,74,0.04)' : '#fff',
              }}
            >
              <input
                type="radio"
                name="delivery_method"
                value={m}
                checked={deliveryMethod === m}
                onChange={() => setDeliveryMethod(m)}
                style={{ accentColor: '#1B2A4A' }}
              />
              {m === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}
            </label>
          ))}
        </div>
      </div>

      {/* Delivery address + state (conditional) */}
      {deliveryMethod === 'delivery' && (
        <>
          {/* State picker */}
          <div>
            <label htmlFor="checkout-state" style={labelStyle}>
              Delivery State <span style={{ color: '#C1542C' }}>*</span>
            </label>
            <select
              id="checkout-state"
              required
              value={deliveryState}
              onChange={(e) => setDeliveryState(e.target.value)}
              style={{ ...inputStyle, appearance: 'none' }}
            >
              <option value="">Select state…</option>
              {NIGERIAN_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Per-seller fee breakdown */}
          {showFees && (
            <div style={{
              background: 'rgba(27,42,74,0.03)',
              border: '1px solid rgba(27,42,74,0.10)',
              borderRadius: 10,
              padding: '14px 16px',
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 13,
            }}>
              {feesBySeller.map((s) => (
                <div key={s.sellerId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1B2A4A', marginBottom: 3 }}>
                    <span>{s.sellerName} — items</span>
                    <span style={{ fontWeight: 600 }}>{fmt(s.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8A7E66', marginBottom: 8 }}>
                    <span>Delivery ({deliveryState})</span>
                    <span>
                      {s.fee === null
                        ? 'TBD — contact seller'
                        : s.fee === 0
                          ? 'Free'
                          : fmt(s.fee)}
                    </span>
                  </div>
                  {feesBySeller.length > 1 && (
                    <div style={{ borderTop: '1px solid rgba(27,42,74,0.08)', marginBottom: 8 }} />
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(27,42,74,0.15)', paddingTop: 8, marginTop: 2 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: '#1B2A4A' }}>
                  Grand total
                </span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A' }}>
                  {fmt(grandTotalWithDelivery)}
                  {feesBySeller.some(s => s.fee === null) && ' + TBD'}
                </span>
              </div>
            </div>
          )}

          {/* Address */}
          <div>
            <label
              htmlFor="checkout-address"
              style={labelStyle}
            >
              Delivery Address <span style={{ color: '#C1542C' }}>*</span>
            </label>

            {/* Saved address quick-fill chips */}
            {savedAddresses.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {savedAddresses.map((addr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAddress(addr)}
                    style={{
                      fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12,
                      color: address === addr ? '#1B2A4A' : '#8A7E66',
                      background: address === addr ? 'rgba(27,42,74,0.08)' : '#fff',
                      border: `1px solid ${address === addr ? 'rgba(27,42,74,0.4)' : 'rgba(27,42,74,0.18)'}`,
                      borderRadius: 20, padding: '4px 12px',
                      cursor: 'pointer', textAlign: 'left', maxWidth: 260,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={addr}
                  >
                    {addr}
                  </button>
                ))}
              </div>
            )}

            <textarea
              id="checkout-address"
              placeholder="Street address, city, state"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid rgba(27,42,74,0.2)',
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 15,
                color: '#1B2A4A',
                background: '#fff',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </>
      )}

      {/* Order breakdown (multi-seller) */}
      {sellerGroups.length > 1 && !showFees && (
        <div
          style={{
            background: 'rgba(27,42,74,0.04)',
            borderRadius: 10,
            padding: '14px 16px',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13,
            color: '#8A7E66',
          }}
        >
          This creates {sellerGroups.length} orders (one per seller):
          {sellerGroups.map((g) => (
            <div key={g.sellerId} style={{ marginTop: 6, color: '#1B2A4A' }}>
              • {g.sellerName} — {g.itemCount} item{g.itemCount !== 1 ? 's' : ''}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(193,84,44,0.08)',
            border: '1px solid rgba(193,84,44,0.4)',
            borderRadius: 8,
            padding: '10px 14px',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13,
            color: '#C1542C',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          background: loading ? '#8A7E66' : '#C1542C',
          color: '#F7F1E3',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 17,
          padding: '16px 0',
          borderRadius: 10,
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          letterSpacing: 0.5,
        }}
      >
        {loading ? 'Placing Order…' : `Place Order · ${nairaTotal}`}
      </button>

      <p
        style={{
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: 12,
          color: '#8A7E66',
          textAlign: 'center',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        By placing this order you agree to pay the seller directly via bank transfer.
        iBuyNaija never holds your money.
      </p>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 13,
  fontWeight: 600,
  color: '#1B2A4A',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(27,42,74,0.2)',
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 15,
  color: '#1B2A4A',
  background: '#fff',
  boxSizing: 'border-box',
};
