'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  listingId: string;
  variantId: string | null;
  stockCount: number;
  quantity?: number;
  disabled?: boolean;
}

export default function AddToCartButton({ listingId, variantId, stockCount, quantity = 1, disabled = false }: Props) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'added' | 'error' | 'out_of_stock'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOutOfStock = stockCount === 0;
  const isDisabled = disabled || isOutOfStock || state === 'loading' || state === 'added';

  async function handleAddToCart() {
    if (!variantId) return;
    setState('loading');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, variant_id: variantId, quantity }),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        setState('out_of_stock');
        setErrorMsg(data.error ?? 'Not enough stock');
        setTimeout(() => setState('idle'), 3500);
        return;
      }
      if (!res.ok) {
        setState('error');
        setTimeout(() => setState('idle'), 3000);
        return;
      }
      setState('added');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  const label =
    isOutOfStock        ? 'Out of Stock' :
    state === 'loading' ? 'Adding…' :
    state === 'added'   ? 'Added to cart ✓' :
    state === 'out_of_stock' ? (errorMsg ?? 'Out of stock') :
    state === 'error'   ? 'Error — try again' :
    'Add to Cart';

  const bg =
    isOutOfStock             ? '#8A7E66' :
    state === 'added'        ? '#2E7D32' :
    state === 'error'        ? '#C1542C' :
    state === 'out_of_stock' ? '#C1542C' :
    '#1B2A4A';

  return (
    <button
      onClick={handleAddToCart}
      disabled={isDisabled}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'center',
        background: bg,
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
