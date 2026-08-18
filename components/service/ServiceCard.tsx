'use client';

import Link from 'next/link';
import { formatNaira } from '@/lib/format';

interface ServiceCardProps {
  id: string;
  name: string;
  description: string;
  price_type: 'fixed' | 'quote';
  price: number | null;
  price_from: number | null;
  duration_minutes: number | null;
  location_type: 'at_provider' | 'provider_travels';
  photos: string[];
  category_name: string;
  provider: {
    business_name: string;
    state: string;
    city_area: string;
    verified_status: boolean;
  };
}

const LOCATION_ICON: Record<string, string> = {
  at_provider:       '📍',
  provider_travels:  '🚗',
};

function formatDuration(mins: number | null): string {
  if (!mins) return '';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function ServiceCard({
  id,
  name,
  description,
  price_type,
  price,
  price_from,
  duration_minutes,
  location_type,
  photos,
  category_name,
  provider,
}: ServiceCardProps) {
  const photo = photos?.[0];
  const priceLabel =
    price_type === 'fixed' && price != null
      ? formatNaira(price)
      : price_from != null
      ? `From ${formatNaira(price_from)}`
      : 'Get a quote';

  return (
    <Link href={`/services/${id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          border: '1px solid rgba(27,42,74,0.08)',
          overflow: 'hidden',
          transition: 'box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(27,42,74,0.12)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      >
        {/* Image */}
        <div
          style={{
            aspectRatio: '16/9',
            background: 'linear-gradient(135deg, #2C426B, #1B2A4A)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                opacity: 0.4,
              }}
            >
              ✂️
            </div>
          )}
          {/* Category chip */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              background: 'rgba(27,42,74,0.75)',
              color: '#F7F1E3',
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 20,
              letterSpacing: 0.3,
              backdropFilter: 'blur(4px)',
            }}
          >
            {category_name}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              color: '#1B2A4A',
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>

          <div
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 13,
              color: '#8A7E66',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {provider.verified_status && (
              <span
                style={{
                  background: '#1B2A4A',
                  color: '#D9A02D',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 4,
                  letterSpacing: 0.3,
                }}
              >
                ✓ VERIFIED
              </span>
            )}
            <span>{provider.business_name}</span>
          </div>

          <div
            style={{
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 13,
              color: '#8A7E66',
              marginBottom: 12,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            } as React.CSSProperties}
          >
            {description}
          </div>

          {/* Footer row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: price_type === 'quote' ? '#8A7E66' : '#1B2A4A',
                  fontStyle: price_type === 'quote' ? 'italic' : 'normal',
                }}
              >
                {priceLabel}
              </div>
            </div>
            <div
              style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 12,
                color: '#8A7E66',
                textAlign: 'right',
              }}
            >
              {LOCATION_ICON[location_type]}{' '}
              {provider.city_area}, {provider.state}
              {duration_minutes && (
                <div style={{ marginTop: 2 }}>⏱ {formatDuration(duration_minutes)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
