'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function RemitButton({ remittanceId }: { remittanceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markRemitted() {
    const reference = prompt('Payment reference (optional):') ?? '';
    startTransition(async () => {
      try {
        const res = await fetch(`/api/payroll/remittances/${remittanceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });
        if (res.ok) router.refresh();
      } catch { /* no-op; user can retry */ }
    });
  }

  return (
    <button
      onClick={markRemitted}
      disabled={pending}
      style={{ background: 'none', color: '#1B2A4A', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, fontWeight: 600, padding: '5px 10px', border: '1px solid rgba(27,42,74,0.15)', borderRadius: 6, cursor: pending ? 'default' : 'pointer' }}
    >
      {pending ? '…' : 'Mark remitted'}
    </button>
  );
}
