'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  listingId: string;
}

export default function RepublishButton({ listingId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRepublish() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to re-publish');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        type="button"
        onClick={handleRepublish}
        disabled={loading}
        style={{
          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600,
          color: '#2E7D32', textDecoration: 'none', padding: '6px 12px',
          border: '1px solid rgba(46,125,50,0.4)', borderRadius: 6, background: '#fff',
          cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? '…' : 'Re-publish'}
      </button>
      {error && (
        <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#C1542C' }}>
          {error}
        </span>
      )}
    </div>
  );
}
