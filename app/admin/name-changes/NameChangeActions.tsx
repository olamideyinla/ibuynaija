'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NameChangeActions({ sellerId }: { sellerId: string }) {
  const router  = useRouter();
  const [loading, setLoading]           = useState<string | null>(null);
  const [error, setError]               = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  async function doAction(action: 'approve' | 'reject') {
    setError('');
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/name-changes/${sellerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: rejectionReason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Action failed'); return; }
      router.refresh();
      setShowRejectForm(false);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      {error && (
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', marginBottom: 10 }}>{error}</div>
      )}

      {!showRejectForm ? (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => doAction('approve')}
            disabled={loading !== null}
            style={{ background: '#2E7D32', color: '#fff', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading === 'approve' ? 'Approving…' : 'Approve'}
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={loading !== null}
            style={{ background: 'none', color: '#C1542C', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(193,84,44,0.3)', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            Reject
          </button>
        </div>
      ) : (
        <div>
          <textarea
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            rows={2}
            placeholder="e.g. Name does not match your CAC certificate."
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, boxSizing: 'border-box',
              border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif",
              fontSize: 13, color: '#1B2A4A', marginBottom: 10, resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => doAction('reject')}
              disabled={loading !== null}
              style={{ background: '#C1542C', color: '#fff', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading === 'reject' ? 'Rejecting…' : 'Confirm rejection'}
            </button>
            <button
              onClick={() => setShowRejectForm(false)}
              disabled={loading !== null}
              style={{ background: 'none', color: '#8A7E66', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(27,42,74,0.2)', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
