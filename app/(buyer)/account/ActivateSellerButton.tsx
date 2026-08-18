'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function ActivateSellerButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function activate() {
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/seller-activate', { method: 'POST' });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? 'Activation failed');
          return;
        }
        router.push('/dashboard');
        router.refresh();
      } catch {
        setError('Network error — please try again');
      }
    });
  }

  return (
    <div>
      <button
        onClick={activate}
        disabled={pending}
        style={{
          background: '#2E7D32', color: '#fff',
          fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
          padding: '11px 22px', borderRadius: 8, border: 'none',
          cursor: pending ? 'default' : 'pointer',
        }}
      >
        {pending ? 'Activating…' : 'Access Seller Dashboard →'}
      </button>
      {error && (
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}
