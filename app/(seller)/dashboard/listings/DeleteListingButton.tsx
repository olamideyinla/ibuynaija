'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteListingButton({ listingId, title }: { listingId: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleDelete() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? 'Delete failed');
          return;
        }
        router.refresh();
      } catch {
        setError('Network error — please try again');
      }
    });
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <button
        onClick={handleDelete}
        disabled={pending}
        style={{
          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600,
          color: pending ? '#8A7E66' : '#C1542C', background: 'none', cursor: pending ? 'default' : 'pointer',
          padding: '6px 12px', border: '1px solid rgba(193,84,44,0.3)', borderRadius: 6,
        }}
      >
        {pending ? 'Deleting…' : 'Delete'}
      </button>
      {error && (
        <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#C1542C' }}>
          {error}
        </span>
      )}
    </span>
  );
}
