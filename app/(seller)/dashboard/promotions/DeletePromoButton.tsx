'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  promotionId: string;
}

export default function DeletePromoButton({ promotionId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm('Delete this upcoming promotion? This cannot be undone.')) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/promotions/${promotionId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to delete promotion.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={isPending}
        style={{
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: 12,
          color: '#8A7E66',
          background: 'none',
          border: '1px solid rgba(138,126,102,0.35)',
          borderRadius: 6,
          padding: '4px 10px',
          cursor: isPending ? 'wait' : 'pointer',
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? 'Deleting…' : 'Delete'}
      </button>
      {error && (
        <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: '#C1542C', marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
