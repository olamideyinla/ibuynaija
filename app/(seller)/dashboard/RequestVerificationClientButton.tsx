'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestVerificationClientButton() {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleRequest() {
    setError('');
    setLoading(true);
    const res  = await fetch('/api/sellers/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_requested: true }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Request failed'); return; }
    router.refresh();
  }

  return (
    <div>
      {error && (
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', marginBottom: 10 }}>{error}</div>
      )}
      <button
        onClick={handleRequest}
        disabled={loading}
        style={{ background: '#1B2A4A', color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Submitting…' : 'Request verification'}
      </button>
    </div>
  );
}
