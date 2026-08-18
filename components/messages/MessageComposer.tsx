'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  contextType: 'order' | 'enquiry';
  contextId: string;
  /** Label shown in the hint, e.g. "You (buyer)" or "You (seller)" */
  senderLabel: string;
}

export default function MessageComposer({ contextType, contextId, senderLabel }: Props) {
  const [body, setBody]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const router = useRouter();

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_type: contextType, context_id: contextId, body: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to send message');
        return;
      }
      setBody('');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      border: '1px solid rgba(27,42,74,0.12)',
      borderRadius: 12,
      overflow: 'hidden',
      background: '#fff',
    }}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a message…"
        rows={3}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: 14,
          color: '#1B2A4A',
          padding: '14px 16px',
          boxSizing: 'border-box',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSend();
        }}
      />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderTop: '1px solid rgba(27,42,74,0.08)',
        background: 'rgba(27,42,74,0.02)',
      }}>
        <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: '#8A7E66' }}>
          {senderLabel} · Ctrl+Enter to send
        </span>
        <button
          onClick={() => void handleSend()}
          disabled={submitting || !body.trim()}
          style={{
            background: submitting || !body.trim() ? 'rgba(27,42,74,0.2)' : '#1B2A4A',
            color: '#F7F1E3',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            cursor: submitting || !body.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </div>
      {error && (
        <div style={{
          padding: '6px 16px 10px',
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: 12,
          color: '#C1542C',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
