'use client';

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
      business_name: string;
      verified_status: boolean;
    };
  };
}

interface Props {
  item: CartItemData;
  onRemove: (itemId: string) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
}

export default function CartItemCard({ item, onRemove, onQuantityChange }: Props) {
  const photo = item.listing.photos?.[0];
  const price = formatNaira(item.listing.price);
  const lineTotal = item.listing.price != null
    ? formatNaira(parseFloat(String(item.listing.price)) * item.quantity)
    : null;

  const attrEntries = Object.entries(item.variant_attributes ?? {});
  const atAtMaxStock = item.variant_stock != null && item.quantity >= item.variant_stock;
  const canIncrement = !item.is_stale && !atAtMaxStock;

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        background: '#fff',
        border: '1px solid rgba(27,42,74,0.08)',
        borderRadius: 12,
        padding: 16,
        opacity: item.is_stale ? 0.6 : 1,
        position: 'relative',
      }}
    >
      {/* Image */}
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 8,
          overflow: 'hidden',
          flexShrink: 0,
          background: '#EFE6D2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {photo ? (
          <img src={photo} alt={item.listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 32 }}>🛍️</span>
        )}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.is_stale && (
          <div
            style={{
              background: '#C1542C',
              color: '#F7F1E3',
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 4,
              display: 'inline-block',
              marginBottom: 6,
              letterSpacing: 0.5,
            }}
          >
            {item.listing.status === 'sold' ? 'SOLD OUT' : 'UNAVAILABLE'} — Remove to continue
          </div>
        )}
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: 15,
            color: '#1B2A4A',
            marginBottom: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.listing.title}
        </div>

        {/* Variant attributes */}
        {attrEntries.length > 0 && (
          <div
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 12,
              color: '#8A7E66',
              marginBottom: 4,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {attrEntries.map(([k, v]) => (
              <span
                key={k}
                style={{
                  background: 'rgba(27,42,74,0.07)',
                  borderRadius: 4,
                  padding: '2px 7px',
                  textTransform: 'capitalize',
                }}
              >
                {k}: {v}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13,
            color: '#8A7E66',
            marginBottom: 8,
          }}
        >
          {item.listing.seller.business_name}
          {item.listing.seller.verified_status && (
            <span style={{ color: '#D9A02D', marginLeft: 4 }}>★ Verified</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Quantity controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid rgba(27,42,74,0.15)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => onQuantityChange(item.id, item.quantity - 1)}
              disabled={item.is_stale || item.quantity <= 1}
              style={{
                width: 32,
                height: 32,
                border: 'none',
                background: 'transparent',
                cursor: item.is_stale || item.quantity <= 1 ? 'not-allowed' : 'pointer',
                fontSize: 18,
                color: '#1B2A4A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              −
            </button>
            <span
              style={{
                width: 36,
                textAlign: 'center',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                color: '#1B2A4A',
              }}
            >
              {item.quantity}
            </span>
            <button
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
              disabled={!canIncrement}
              title={atAtMaxStock ? `Max stock: ${item.variant_stock}` : undefined}
              style={{
                width: 32,
                height: 32,
                border: 'none',
                background: 'transparent',
                cursor: canIncrement ? 'pointer' : 'not-allowed',
                fontSize: 18,
                color: canIncrement ? '#1B2A4A' : '#8A7E66',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +
            </button>
          </div>
          {/* Price */}
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: '#1B2A4A',
              }}
            >
              {lineTotal ?? price ?? '—'}
            </span>
            {item.quantity > 1 && price && (
              <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, color: '#8A7E66', marginLeft: 4 }}>
                ({price} each)
              </span>
            )}
          </div>
          {/* Remove */}
          <button
            onClick={() => onRemove(item.id)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#8A7E66',
              fontSize: 18,
              padding: 4,
            }}
            title="Remove"
          >
            ✕
          </button>
        </div>

        {/* Stock cap warning */}
        {atAtMaxStock && !item.is_stale && (
          <div
            style={{
              marginTop: 6,
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 12,
              color: '#C1542C',
            }}
          >
            Max available: {item.variant_stock}
          </div>
        )}
      </div>
    </div>
  );
}
