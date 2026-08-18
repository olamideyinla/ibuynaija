'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddToCartButton from './AddToCartButton';

const MAX_QTY = 10;

function BuyNowButton({
  listingId,
  variantId,
  stockCount,
  quantity,
  disabled = false,
}: {
  listingId: string;
  variantId: string | null;
  stockCount: number;
  quantity: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  const isOutOfStock = stockCount === 0;
  const isDisabled = disabled || isOutOfStock || state === 'loading';

  async function handleBuyNow() {
    if (!variantId) return;
    setState('loading');
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, variant_id: variantId, quantity }),
      });
      if (res.status === 401) { router.push('/login'); return; }
      if (!res.ok) { setState('error'); setTimeout(() => setState('idle'), 3000); return; }
      router.push('/checkout');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  const label =
    isOutOfStock      ? 'Out of Stock' :
    state === 'loading' ? 'Processing…' :
    state === 'error'   ? 'Error — try again' :
    'Buy Now';

  return (
    <button
      onClick={handleBuyNow}
      disabled={isDisabled}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'center',
        background: isOutOfStock ? '#8A7E66' : state === 'error' ? '#C1542C' : '#C1542C',
        color: '#F7F1E3',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: 16,
        padding: '14px 0',
        borderRadius: 10,
        border: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        letterSpacing: 0.5,
        transition: 'background 0.2s',
        opacity: disabled && !isOutOfStock ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

interface Variant {
  id: string;
  attributes: Record<string, string>;
  price_override: number | null;
  stock_count: number;
  is_available: boolean;
}

interface Props {
  listingId: string;
  variants: Variant[];
}

function QtyStepperRow({ qty, setQty, max }: { qty: number; setQty: (q: number) => void; max: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: 'fit-content' }}>
      <button
        type="button"
        onClick={() => setQty(Math.max(1, qty - 1))}
        disabled={qty <= 1}
        style={{
          width: 36, height: 36,
          border: '1.5px solid rgba(27,42,74,0.25)',
          borderRight: 'none',
          borderRadius: '8px 0 0 8px',
          background: '#fff',
          color: '#1B2A4A',
          fontSize: 18,
          cursor: qty <= 1 ? 'not-allowed' : 'pointer',
          fontFamily: "'Space Grotesk', sans-serif",
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: qty <= 1 ? 0.4 : 1,
        }}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <div style={{
        width: 42, height: 36,
        border: '1.5px solid rgba(27,42,74,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: 15,
        color: '#1B2A4A',
        background: '#fff',
      }}>
        {qty}
      </div>
      <button
        type="button"
        onClick={() => setQty(Math.min(max, qty + 1))}
        disabled={qty >= max}
        style={{
          width: 36, height: 36,
          border: '1.5px solid rgba(27,42,74,0.25)',
          borderLeft: 'none',
          borderRadius: '0 8px 8px 0',
          background: '#fff',
          color: '#1B2A4A',
          fontSize: 18,
          cursor: qty >= max ? 'not-allowed' : 'pointer',
          fontFamily: "'Space Grotesk', sans-serif",
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: qty >= max ? 0.4 : 1,
        }}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

export default function VariantPicker({ listingId, variants }: Props) {
  // Single implicit variant (attributes = {}) — no attribute UI needed
  if (variants.length === 1 && Object.keys(variants[0].attributes).length === 0) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [qty, setQty] = useState(1);
    const maxQty = Math.min(variants[0].stock_count, MAX_QTY);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {maxQty > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 13, fontWeight: 600, color: '#1B2A4A',
            }}>Quantity</span>
            <QtyStepperRow qty={qty} setQty={setQty} max={maxQty} />
          </div>
        )}
        <BuyNowButton
          listingId={listingId}
          variantId={variants[0].id}
          stockCount={variants[0].stock_count}
          quantity={qty}
        />
        <AddToCartButton
          listingId={listingId}
          variantId={variants[0].id}
          stockCount={variants[0].stock_count}
          quantity={qty}
        />
      </div>
    );
  }

  // Group attributes by key so we can render one chip row per dimension
  // e.g. { size: ["S","M","L"], colour: ["Red","Blue"] }
  const allKeys = Array.from(
    new Set(variants.flatMap((v) => Object.keys(v.attributes))),
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [selections, setSelections] = useState<Record<string, string>>({});
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [qty, setQty] = useState(1);

  // Find the matching variant for current selections
  const selectedVariant = variants.find((v) =>
    allKeys.every((k) => v.attributes[k] === selections[k]),
  ) ?? null;

  function select(key: string, value: string) {
    setSelections((prev) => {
      const next = { ...prev, [key]: value };
      // Reset qty to 1 when selection changes
      setQty(1);
      return next;
    });
  }

  // Values available per key given current other selections
  function valuesForKey(key: string): string[] {
    return Array.from(
      new Set(
        variants
          .filter((v) =>
            allKeys
              .filter((k) => k !== key)
              .every((k) => !selections[k] || v.attributes[k] === selections[k]),
          )
          .map((v) => v.attributes[key])
          .filter(Boolean),
      ),
    );
  }

  const isFullySelected = allKeys.every((k) => selections[k]);
  const maxQty = selectedVariant ? Math.min(selectedVariant.stock_count, MAX_QTY) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {allKeys.map((key) => (
        <div key={key}>
          <div
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: '#8A7E66',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            {key}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {valuesForKey(key).map((value) => {
              const isSelected = selections[key] === value;
              // Check if selecting this would leave any available variant
              const wouldHaveStock = variants.some(
                (v) =>
                  v.attributes[key] === value &&
                  allKeys
                    .filter((k) => k !== key)
                    .every((k) => !selections[k] || v.attributes[k] === selections[k]) &&
                  v.is_available,
              );
              return (
                <button
                  key={value}
                  onClick={() => select(key, value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: isSelected
                      ? '2px solid #1B2A4A'
                      : '1.5px solid rgba(27,42,74,0.2)',
                    background: isSelected ? '#1B2A4A' : '#fff',
                    color: isSelected ? '#F7F1E3' : wouldHaveStock ? '#1B2A4A' : '#8A7E66',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    opacity: wouldHaveStock ? 1 : 0.5,
                    textDecoration: wouldHaveStock ? 'none' : 'line-through',
                  }}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selectedVariant && !selectedVariant.is_available && (
        <div
          style={{
            background: 'rgba(193,84,44,0.08)',
            border: '1px solid rgba(193,84,44,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13,
            color: '#C1542C',
          }}
        >
          This variant is out of stock.
        </div>
      )}

      {!isFullySelected && (
        <p
          style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13,
            color: '#8A7E66',
            margin: 0,
          }}
        >
          Please select {allKeys.filter((k) => !selections[k]).join(' and ')} to continue.
        </p>
      )}

      {isFullySelected && selectedVariant?.is_available && maxQty > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13, fontWeight: 600, color: '#1B2A4A',
          }}>Quantity</span>
          <QtyStepperRow qty={qty} setQty={setQty} max={maxQty} />
        </div>
      )}

      <BuyNowButton
        listingId={listingId}
        variantId={selectedVariant?.id ?? null}
        stockCount={selectedVariant?.stock_count ?? 0}
        quantity={qty}
        disabled={!isFullySelected || !selectedVariant?.is_available}
      />
      <AddToCartButton
        listingId={listingId}
        variantId={selectedVariant?.id ?? null}
        stockCount={selectedVariant?.stock_count ?? 0}
        quantity={qty}
        disabled={!isFullySelected || !selectedVariant?.is_available}
      />
    </div>
  );
}
