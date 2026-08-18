'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteServiceButton({ serviceId, name }: { serviceId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch(`/api/services/${serviceId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Delete failed'); return; }
        router.refresh();
      } catch {
        setError('Network error — please try again');
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        style={{
          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600,
          color: '#C1542C', background: 'none', border: '1px solid rgba(193,84,44,0.25)',
          borderRadius: 7, padding: '5px 12px', cursor: pending ? 'default' : 'pointer',
        }}
      >
        {pending ? '…' : 'Delete'}
      </button>
      {error && (
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#C1542C', margin: '4px 0 0', maxWidth: 200 }}>
          {error}
        </p>
      )}
    </div>
  );
}
