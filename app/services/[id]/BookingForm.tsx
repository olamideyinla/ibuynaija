'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@/lib/format';

interface AvailableSlot {
  date: string;          // YYYY-MM-DD
  day_label: string;
  start_time: string;    // HH:MM
  end_time: string;
}

interface Props {
  serviceId: string;
  priceType: 'fixed' | 'quote';
  price: number | null;
  priceFrom: number | null;
  locationRequired: boolean;   // true when location_type = 'provider_travels'
  availableSlots: AvailableSlot[];
}

function slotLabel(slot: AvailableSlot): string {
  const date = new Date(slot.date + 'T12:00:00');
  const dateStr = date.toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${dateStr}  ·  ${slot.start_time} – ${slot.end_time}`;
}

function slotDatetime(slot: AvailableSlot): string {
  // Combine date + start_time into an ISO-like string (assume WAT, UTC+1)
  return `${slot.date}T${slot.start_time}:00+01:00`;
}

export default function BookingForm({
  serviceId,
  priceType,
  price,
  priceFrom,
  locationRequired,
  availableSlots,
}: Props) {
  const router = useRouter();
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [preferredDate, setPreferredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isFixed = priceType === 'fixed';
  const canSubmit = isFixed
    ? selectedSlot !== ''
    : notes.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);

    const body: Record<string, string | undefined> = {
      service_id: serviceId,
      notes: notes || undefined,
      address: locationRequired && address ? address : undefined,
    };

    if (isFixed) {
      // Parse selected slot → requested_datetime
      const slot = availableSlots.find((s) => `${s.date}T${s.start_time}` === selectedSlot);
      if (!slot) {
        setError('Please select a slot.');
        setLoading(false);
        return;
      }
      body.requested_datetime = slotDatetime(slot);
    } else {
      // Quote: if a slot was chosen from the picker, send it as requested_datetime
      if (selectedSlot) {
        const slot = availableSlots.find((s) => `${s.date}T${s.start_time}` === selectedSlot);
        if (slot) body.requested_datetime = slotDatetime(slot);
      } else {
        body.preferred_date = preferredDate || undefined;
      }
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        setError(data.error ?? 'Booking failed. Please try again.');
        setLoading(false);
        return;
      }
      router.push(`/bookings/${data.booking.id}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {isFixed ? (
        /* Fixed-price: slot picker */
        <div>
          <label
            style={{
              display: 'block',
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#1B2A4A',
              marginBottom: 8,
            }}
          >
            Choose an available slot <span style={{ color: '#C1542C' }}>*</span>
          </label>
          {availableSlots.length === 0 ? (
            <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#8A7E66' }}>
              No upcoming slots available. Please contact the provider.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {availableSlots.map((slot) => {
                const val = `${slot.date}T${slot.start_time}`;
                const selected = selectedSlot === val;
                return (
                  <label
                    key={val}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: `2px solid ${selected ? '#1B2A4A' : 'rgba(27,42,74,0.15)'}`,
                      background: selected ? 'rgba(27,42,74,0.04)' : '#fff',
                      cursor: 'pointer',
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontSize: 14,
                      color: '#1B2A4A',
                    }}
                  >
                    <input
                      type="radio"
                      name="slot"
                      value={val}
                      checked={selected}
                      onChange={() => setSelectedSlot(val)}
                      style={{ accentColor: '#1B2A4A' }}
                    />
                    {slotLabel(slot)}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Quote: job description + optional slot picker */
        <>
          <div>
            <label
              htmlFor="booking-notes"
              style={{
                display: 'block',
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: '#1B2A4A',
                marginBottom: 6,
              }}
            >
              Describe your job <span style={{ color: '#C1542C' }}>*</span>
            </label>
            <textarea
              id="booking-notes"
              placeholder="Describe what you need — hair length, condition, any special requests…"
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              style={{
                display: 'block',
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid rgba(27,42,74,0.2)',
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 14,
                color: '#1B2A4A',
                background: '#fff',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Preferred slot — show picker if provider has availability, otherwise plain date */}
          {availableSlots.length > 0 ? (
            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1B2A4A',
                  marginBottom: 8,
                }}
              >
                Preferred slot{' '}
                <span style={{ color: '#8A7E66', fontWeight: 400 }}>(optional — provider will confirm)</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {availableSlots.map((slot) => {
                  const val = `${slot.date}T${slot.start_time}`;
                  const selected = selectedSlot === val;
                  return (
                    <label
                      key={val}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 14px',
                        borderRadius: 10,
                        border: `2px solid ${selected ? '#1B2A4A' : 'rgba(27,42,74,0.15)'}`,
                        background: selected ? 'rgba(27,42,74,0.04)' : '#fff',
                        cursor: 'pointer',
                        fontFamily: "'Hanken Grotesk', sans-serif",
                        fontSize: 14,
                        color: '#1B2A4A',
                      }}
                    >
                      <input
                        type="radio"
                        name="quote-slot"
                        value={val}
                        checked={selected}
                        onChange={() => setSelectedSlot(val)}
                        style={{ accentColor: '#1B2A4A' }}
                      />
                      {slotLabel(slot)}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="preferred-date"
                style={{
                  display: 'block',
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1B2A4A',
                  marginBottom: 6,
                }}
              >
                Preferred date{' '}
                <span style={{ color: '#8A7E66', fontWeight: 400 }}>(optional — provider will confirm)</span>
              </label>
              <input
                id="preferred-date"
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(27,42,74,0.2)',
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: 14,
                  color: '#1B2A4A',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Indicative price */}
          {priceFrom != null && (
            <div
              style={{
                background: 'rgba(27,42,74,0.04)',
                borderRadius: 10,
                padding: '12px 14px',
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 13,
                color: '#8A7E66',
              }}
            >
              Indicative price from{' '}
              <strong style={{ color: '#1B2A4A' }}>{formatNaira(priceFrom)}</strong>.
              The provider will confirm an exact price after reviewing your request.
            </div>
          )}
        </>
      )}

      {/* Transport cost notice + address (for provider_travels) */}
      {locationRequired && (
        <div
          style={{
            background: 'rgba(193,84,44,0.07)',
            border: '1px solid rgba(193,84,44,0.3)',
            borderRadius: 10,
            padding: '11px 14px',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13,
            color: '#C1542C',
            lineHeight: 1.5,
          }}
        >
          <strong>Home service:</strong> The provider will travel to your location. Transport costs are not included in the displayed price — you will cover the provider&apos;s travel expenses separately.
        </div>
      )}
      {locationRequired && (
        <div>
          <label
            htmlFor="booking-address"
            style={{
              display: 'block',
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#1B2A4A',
              marginBottom: 6,
            }}
          >
            Your address{' '}
            <span style={{ color: '#8A7E66', fontWeight: 400 }}>(provider travels to you)</span>
          </label>
          <textarea
            id="booking-address"
            placeholder="Street address, area, city"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            style={{
              display: 'block',
              width: '100%',
              padding: '11px 14px',
              borderRadius: 10,
              border: '1px solid rgba(27,42,74,0.2)',
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 14,
              color: '#1B2A4A',
              background: '#fff',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Fixed-price notes (optional) */}
      {isFixed && (
        <div>
          <label
            htmlFor="booking-notes-fixed"
            style={{
              display: 'block',
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: '#1B2A4A',
              marginBottom: 6,
            }}
          >
            Notes for the provider{' '}
            <span style={{ color: '#8A7E66', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id="booking-notes-fixed"
            placeholder="Any special instructions or preferences…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{
              display: 'block',
              width: '100%',
              padding: '11px 14px',
              borderRadius: 10,
              border: '1px solid rgba(27,42,74,0.2)',
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 14,
              color: '#1B2A4A',
              background: '#fff',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
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
        disabled={!canSubmit || loading}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          background: !canSubmit || loading ? '#8A7E66' : '#1B2A4A',
          color: '#F7F1E3',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 16,
          padding: '14px 0',
          borderRadius: 10,
          border: 'none',
          cursor: !canSubmit || loading ? 'not-allowed' : 'pointer',
          letterSpacing: 0.5,
        }}
      >
        {loading
          ? 'Sending request…'
          : isFixed
          ? `Request Booking${price != null ? ` · ${formatNaira(price)}` : ''}`
          : 'Request a Quote'}
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
        {isFixed
          ? 'Your booking is not confirmed until the provider accepts it.'
          : 'The provider will review your request and respond with availability and pricing.'}
      </p>
    </form>
  );
}
