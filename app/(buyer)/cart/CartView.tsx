'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CartItemCard from '@/components/cart/CartItemCard';
import { formatNaira } from '@/lib/format';

interface CartItemData {
  id: string;
  quantity: number;
  is_stale: boolean;
  variant_attributes?: Record<string, string>;
  variant_stock?: number;
  listing: {
    id: string;
    title: string;
    price: number | string | null;
    photos: string[];
    status: string;
    seller: {
      id: string;
      business_name: string;
      verified_status: boolean;
    };
  };
}

interface Props {
  initialItems: CartItemData[];
}

export default function CartView({ initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<CartItemData[]>(initialItems);

  const hasStale = items.some((i) => i.is_stale);

  async function handleRemove(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await fetch(`/api/cart/${itemId}`, { method: 'DELETE' }).catch(() => null);
  }

  async function handleQuantityChange(itemId: string, newQty: number) {
    if (newQty < 1) {
      await handleRemove(itemId);
      return;
    }

    // Optimistic update
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, quantity: newQty } : i));

    const res = await fetch(`/api/cart/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQty }),
    }).catch(() => null);

    if (res && res.status === 409) {
      // Stock was insufficient — revert to the max available
      const data = await res.json().catch(() => ({}));
      const available: number = data.available ?? 1;
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, quantity: available, variant_stock: available }
            : i,
        ),
      );
    } else if (!res || !res.ok) {
      // Unknown error — revert optimistic update by re-fetching would be ideal;
      // for simplicity, just reload so state is consistent.
      router.refresh();
    }
  }

  // Group by seller for summary
  const bySeller = new Map<string, { name: string; subtotal: number }>();
  for (const item of items) {
    if (item.is_stale || item.listing.price == null) continue;
    const s = item.listing.seller;
    const existing = bySeller.get(s.id) ?? { name: s.business_name, subtotal: 0 };
    existing.subtotal += parseFloat(String(item.listing.price)) * item.quantity;
    bySeller.set(s.id, existing);
  }
  const grandTotal = Array.from(bySeller.values()).reduce((s, x) => s + x.subtotal, 0);

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
        <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 16, color: '#8A7E66' }}>
          Your cart is empty.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            marginTop: 16,
            background: '#1B2A4A',
            color: '#F7F1E3',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            padding: '12px 24px',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          Browse Market
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 32, alignItems: 'start' }}>
      {/* Items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item) => (
          <CartItemCard
            key={item.id}
            item={item}
            onRemove={handleRemove}
            onQuantityChange={handleQuantityChange}
          />
        ))}
      </div>

      {/* Order summary sidebar */}
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(27,42,74,0.1)',
          borderRadius: 14,
          padding: 24,
          position: 'sticky',
          top: 80,
        }}
      >
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: '#1B2A4A',
            margin: '0 0 20px',
          }}
        >
          Order Summary
        </h2>

        {Array.from(bySeller.entries()).map(([sellerId, s]) => (
          <div key={sellerId} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#8A7E66' }}>
                {s.name}
              </span>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: '#1B2A4A' }}>
                {formatNaira(s.subtotal)}
              </span>
            </div>
          </div>
        ))}

        <div
          style={{
            borderTop: '1px solid rgba(27,42,74,0.1)',
            paddingTop: 14,
            marginTop: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 20,
          }}
        >
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: '#1B2A4A' }}>
            Grand Total
          </span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: '#1B2A4A' }}>
            {formatNaira(grandTotal)}
          </span>
        </div>

        {hasStale && (
          <div
            style={{
              background: 'rgba(193,84,44,0.08)',
              border: '1px solid rgba(193,84,44,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 13,
              color: '#C1542C',
            }}
          >
            Remove unavailable items before checking out.
          </div>
        )}

        <button
          disabled={hasStale || items.length === 0}
          onClick={() => router.push('/checkout')}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            background: hasStale ? '#8A7E66' : '#C1542C',
            color: '#F7F1E3',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            padding: '14px 0',
            borderRadius: 10,
            border: 'none',
            cursor: hasStale ? 'not-allowed' : 'pointer',
            letterSpacing: 0.5,
          }}
        >
          Proceed to Checkout
        </button>

        <p
          style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 12,
            color: '#8A7E66',
            textAlign: 'center',
            margin: '12px 0 0',
          }}
        >
          {bySeller.size > 1
            ? `Creates ${bySeller.size} orders (one per seller)`
            : 'Pay seller directly via bank transfer'}
        </p>
      </div>
    </div>
  );
}
