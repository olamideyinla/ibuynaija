'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const NAVY = '#1B2A4A';
const GREEN = '#2E7D32';
const RED = '#C1542C';

export default function RunActions({ runId, status }: { runId: string; status: 'draft' | 'approved' | 'paid' }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function act(path: string, method: string, confirmMsg?: string, redirectTo?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch(path, { method });
        if (!res.ok) { setError((await res.json()).error ?? 'Action failed'); return; }
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } catch { setError('Network error, please try again'); }
    });
  }

  const btn = (bg: string): React.CSSProperties => ({
    background: bg, color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600,
    fontSize: 14, padding: '9px 18px', borderRadius: 8, border: 'none', cursor: pending ? 'default' : 'pointer',
  });
  const ghost: React.CSSProperties = {
    background: 'none', color: RED, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600,
    padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(193,84,44,0.3)', cursor: pending ? 'default' : 'pointer',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {status === 'draft' && (
          <>
            <button style={btn(NAVY)} disabled={pending} onClick={() => act(`/api/payroll/runs/${runId}/approve`, 'POST')}>
              Approve run
            </button>
            <button style={ghost} disabled={pending} onClick={() => act(`/api/payroll/runs/${runId}`, 'DELETE', 'Delete this draft run? Payslips and remittances will be removed.', '/dashboard/payroll')}>
              Delete draft
            </button>
          </>
        )}
        {status === 'approved' && (
          <button style={btn(GREEN)} disabled={pending} onClick={() => act(`/api/payroll/runs/${runId}/pay`, 'POST', 'Mark this payroll as paid? This records a labour expense for the total employer cost.')}>
            Mark as paid
          </button>
        )}
        {status === 'paid' && (
          <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: GREEN, fontWeight: 600 }}>
            ✓ Paid and recorded as a business expense
          </span>
        )}
      </div>
      {error && <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: RED, marginTop: 10 }}>{error}</div>}
    </div>
  );
}
