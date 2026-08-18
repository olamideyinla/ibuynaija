'use client';

import { useState } from 'react';
import type { BookingStatus } from '@/types';

interface Props {
  bookingId: string;
  currentStatus: BookingStatus;
  isQuote: boolean;
  onStatusChange: (newStatus: BookingStatus) => void;
}

export default function ProviderBookingActions({ bookingId, currentStatus, isQuote, onStatusChange }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [providerNote, setProviderNote] = useState('');
  const [confirmedPrice, setConfirmedPrice] = useState('');
  const [confirmedDatetime, setConfirmedDatetime] = useState('');
  const [showConfirmForm, setShowConfirmForm] = useState(false);

  async function callEndpoint(endpoint: string, body: Record<string, unknown>, label: string) {
    setError('');
    setLoading(label);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Action failed. Please try again.');
        setLoading(null);
        return;
      }
      onStatusChange(data.status as BookingStatus);
      setLoading(null);
    } catch {
      setError('Network error. Please try again.');
      setLoading(null);
    }
  }

  async function handleConfirm() {
    const body: Record<string, unknown> = {
      provider_note: providerNote || undefined,
    };
    if (isQuote) {
      const price = parseFloat(confirmedPrice);
      if (isNaN(price) || price <= 0) {
        setError('A valid confirmed price is required for quote bookings.');
        return;
      }
      body.confirmed_price = price;
    }
    if (confirmedDatetime) {
      body.confirmed_datetime = new Date(confirmedDatetime).toISOString();
    }
    await callEndpoint('confirm', body, 'confirm');
  }

  if (currentStatus === 'completed' || currentStatus === 'no_show' || currentStatus === 'cancelled') {
    return null;
  }

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 14, padding: 24, marginTop: 24 }}>
      <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17, color: '#1B2A4A', margin: '0 0 16px' }}>
        Actions
      </h3>

      {error && (
        <div style={{ background: 'rgba(193,84,44,0.08)', border: '1px solid rgba(193,84,44,0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C' }}>
          {error}
        </div>
      )}

      {currentStatus === 'requested' && (
        <>
          {showConfirmForm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Quote: price input */}
              {isQuote && (
                <div>
                  <label style={{ display: 'block', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: '#1B2A4A', marginBottom: 6 }}>
                    Agreed price (₦) <span style={{ color: '#C1542C' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 35000"
                    value={confirmedPrice}
                    onChange={(e) => setConfirmedPrice(e.target.value)}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: '#1B2A4A', background: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
              )}
              {/* Confirmed datetime (optional) */}
              <div>
                <label style={{ display: 'block', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: '#1B2A4A', marginBottom: 6 }}>
                  Confirmed date & time{' '}
                  <span style={{ color: '#8A7E66', fontWeight: 400 }}>
                    {isQuote ? '(required — agree a time with the buyer)' : '(optional — confirm or reschedule)'}
                  </span>
                </label>
                <input
                  type="datetime-local"
                  value={confirmedDatetime}
                  onChange={(e) => setConfirmedDatetime(e.target.value)}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
              {/* Provider note */}
              <div>
                <label style={{ display: 'block', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: '#1B2A4A', marginBottom: 6 }}>
                  Message to buyer <span style={{ color: '#8A7E66', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  placeholder="e.g. Please bring your own hair extensions."
                  value={providerNote}
                  onChange={(e) => setProviderNote(e.target.value)}
                  rows={2}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', background: '#fff', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleConfirm}
                  disabled={loading !== null}
                  style={{ flex: 1, background: '#1B2A4A', color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, padding: '12px 0', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading === 'confirm' ? 'Confirming…' : 'Confirm Booking'}
                </button>
                <button
                  onClick={() => { setShowConfirmForm(false); setError(''); }}
                  style={{ padding: '12px 16px', background: 'transparent', color: '#8A7E66', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, borderRadius: 10, border: '1px solid rgba(27,42,74,0.2)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowConfirmForm(true)}
                style={{ background: '#1B2A4A', color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, padding: '12px 20px', borderRadius: 10, border: 'none', cursor: 'pointer' }}
              >
                ✓ Confirm
              </button>
              <button
                onClick={() => callEndpoint('decline', { provider_note: providerNote || undefined }, 'decline')}
                disabled={loading !== null}
                style={{ background: 'transparent', color: '#C1542C', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, padding: '12px 20px', borderRadius: 10, border: '2px solid #C1542C', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading === 'decline' ? 'Declining…' : '✕ Decline'}
              </button>
            </div>
          )}
        </>
      )}

      {currentStatus === 'confirmed' && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => callEndpoint('complete', { outcome: 'completed' }, 'completed')}
            disabled={loading !== null}
            style={{ background: '#2E7D32', color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, padding: '12px 20px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading === 'completed' ? 'Marking…' : '✓ Mark Completed'}
          </button>
          <button
            onClick={() => callEndpoint('complete', { outcome: 'no_show' }, 'no_show')}
            disabled={loading !== null}
            style={{ background: 'transparent', color: '#C1542C', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, padding: '12px 20px', borderRadius: 10, border: '2px solid rgba(193,84,44,0.5)', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading === 'no_show' ? 'Marking…' : 'No-show'}
          </button>
        </div>
      )}
    </div>
  );
}
