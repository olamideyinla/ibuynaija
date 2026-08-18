'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  promotionId: string;
}

export default function EndPromoButton({ promotionId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleEnd() {
    if (!confirm('End this promotion now? Buyers will immediately see original prices.')) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/promotions/${promotionId}`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to end promotion.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        onClick={handleEnd}
        disabled={isPending}
        style={{
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: 12,
          color: '#C1542C',
          background: 'none',
          border: '1px solid rgba(193,84,44,0.35)',
          borderRadius: 6,
          padding: '4px 10px',
          cursor: isPending ? 'wait' : 'pointer',
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? 'Ending…' : 'End early'}
      </button>
      {error && (
        <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: '#C1542C', marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
