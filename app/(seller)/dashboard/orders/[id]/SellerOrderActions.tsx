'use client';

import { useState } from 'react';
import type { OrderStatus } from '@/types';

interface Props {
  orderId: string;
  currentStatus: OrderStatus;
  receiptUrl: string | null;
  onStatusChange: (newStatus: OrderStatus) => void;
}

export default function SellerOrderActions({ orderId, currentStatus, receiptUrl, onStatusChange }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function transition(toStatus: string) {
    setError('');
    setLoading(toStatus);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Action failed. Please try again.');
        setLoading(null);
        return;
      }
      onStatusChange(toStatus as OrderStatus);
      setLoading(null);
    } catch {
      setError('Network error. Please try again.');
      setLoading(null);
    }
  }

  if (currentStatus === 'fulfilled' || currentStatus === 'cancelled' || currentStatus === 'awaiting_payment') {
    return null;
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(27,42,74,0.1)',
        borderRadius: 14,
        padding: 24,
        marginTop: 24,
      }}
    >
      <h3
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 17,
          color: '#1B2A4A',
          margin: '0 0 16px',
        }}
      >
        Order Actions
      </h3>

      {receiptUrl && (
        <div style={{ marginBottom: 16, fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: '#8A7E66' }}>
          Buyer submitted a receipt:{' '}
          <a href={receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1B2A4A', fontWeight: 600 }}>
            View receipt
          </a>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(193,84,44,0.08)',
            border: '1px solid rgba(193,84,44,0.4)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 14,
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13,
            color: '#C1542C',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {currentStatus === 'payment_claimed' && (
          <button
            onClick={() => transition('confirmed_by_seller')}
            disabled={loading !== null}
            style={{
              background: '#1B2A4A',
              color: '#F7F1E3',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              padding: '12px 20px',
              borderRadius: 10,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading === 'confirmed_by_seller' ? 'Confirming…' : 'Confirm Payment Received'}
          </button>
        )}

        {currentStatus === 'confirmed_by_seller' && (
          <button
            onClick={() => transition('fulfilled')}
            disabled={loading !== null}
            style={{
              background: '#2E7D32',
              color: '#F7F1E3',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              padding: '12px 20px',
              borderRadius: 10,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading === 'fulfilled' ? 'Marking…' : 'Mark as Fulfilled'}
          </button>
        )}

        <button
          onClick={() => transition('cancelled')}
          disabled={loading !== null}
          style={{
            background: 'transparent',
            color: '#C1542C',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            padding: '12px 20px',
            borderRadius: 10,
            border: '2px solid #C1542C',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading === 'cancelled' ? 'Cancelling…' : 'Cancel Order'}
        </button>
      </div>
    </div>
  );
}
