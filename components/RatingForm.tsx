'use client';

import { useState } from 'react';

interface Props {
  listingId: string;
  listingTitle: string;
}

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1,
              fontSize: 22,
              color: star <= (hovered || value) ? '#D9A02D' : 'rgba(27,42,74,0.2)',
              transition: 'color 0.1s',
            }}
            aria-label={`${star} star`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RatingForm({ listingId, listingTitle }: Props) {
  const [beScore, setBeScore] = useState(0);
  const [pqScore, setPqScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (beScore === 0 || pqScore === 0) {
      setError('Please give both scores before submitting.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          buying_experience_score: beScore,
          product_quality_score: pqScore,
          comment: comment || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit rating');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{
        background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.25)',
        borderRadius: 10, padding: '14px 18px',
        fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#2E7D32',
      }}>
        Rating submitted. Thank you!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#FAF8F4', border: '1px solid rgba(27,42,74,0.1)',
      borderRadius: 10, padding: '16px 18px',
    }}>
      <div style={{
        fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13,
        color: '#1B2A4A', marginBottom: 12,
      }}>
        Rate: {listingTitle}
      </div>

      <StarRow label="Buying experience" value={beScore} onChange={setBeScore} />
      <StarRow label="Product quality"   value={pqScore} onChange={setPqScore} />

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', display: 'block', marginBottom: 4 }}>
          Comment (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="Tell others about your experience…"
          style={{
            width: '100%', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13,
            color: '#1B2A4A', border: '1px solid rgba(27,42,74,0.2)', borderRadius: 8,
            padding: '8px 10px', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#C1542C', marginBottom: 10 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || beScore === 0 || pqScore === 0}
        style={{
          background: submitting || beScore === 0 || pqScore === 0 ? 'rgba(27,42,74,0.3)' : '#1B2A4A',
          color: '#F7F1E3', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600,
          fontSize: 13, border: 'none', borderRadius: 8, padding: '8px 18px',
          cursor: submitting || beScore === 0 || pqScore === 0 ? 'default' : 'pointer',
        }}
      >
        {submitting ? 'Submitting…' : 'Submit rating'}
      </button>
    </form>
  );
}
