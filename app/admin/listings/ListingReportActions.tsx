'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ListingReportActions({ reportId }: { reportId: string }) {
  const router  = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState('');

  async function doAction(action: string) {
    setError('');
    setLoading(action);
    const res = await fetch(`/api/admin/listings/${reportId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { setError(data.error ?? 'Action failed'); return; }
    router.refresh();
  }

  return (
    <div>
      {error && (
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', marginBottom: 10 }}>{error}</div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => doAction('resolve')}
          disabled={loading !== null}
          style={{ background: 'rgba(27,42,74,0.08)', color: '#1B2A4A', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading === 'resolve' ? 'Resolving…' : 'Mark resolved (keep listing)'}
        </button>
        <button
          onClick={() => doAction('remove_listing')}
          disabled={loading !== null}
          style={{ background: 'transparent', color: '#C1542C', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '2px solid rgba(193,84,44,0.5)', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading === 'remove_listing' ? 'Removing…' : 'Remove listing'}
        </button>
      </div>
    </div>
  );
}
