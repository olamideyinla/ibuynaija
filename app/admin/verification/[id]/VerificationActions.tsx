'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Note { id: string; text: string; date_created: string; admin_email: string }
interface Props {
  sellerId: string;
  currentStatus: { verified: boolean; requested: boolean };
  existingNotes: Note[];
}

export default function VerificationActions({ sellerId, currentStatus, existingNotes }: Props) {
  const router  = useRouter();
  const [notes, setNotes] = useState<Note[]>(existingNotes);
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading]   = useState<string | null>(null);
  const [error, setError]       = useState('');

  async function doAction(action: string) {
    setError('');
    setLoading(action);
    const res = await fetch(`/api/admin/verification/${sellerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { setError(data.error ?? 'Action failed'); return; }
    router.refresh();
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setError('');
    setLoading('note');
    const res = await fetch(`/api/admin/verification/${sellerId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: noteText }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { setError(data.error ?? 'Failed to save note'); return; }
    setNotes([data.note, ...notes]);
    setNoteText('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Action buttons */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 14, padding: 24 }}>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17, color: '#1B2A4A', margin: '0 0 16px' }}>
          Actions
        </h3>
        {error && (
          <div style={{ background: 'rgba(193,84,44,0.08)', border: '1px solid rgba(193,84,44,0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {!currentStatus.verified && (
            <button
              onClick={() => doAction('approve')}
              disabled={loading !== null}
              style={{ background: '#2E7D32', color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading === 'approve' ? 'Approving…' : '✓ Approve Verification'}
            </button>
          )}
          {!currentStatus.verified && currentStatus.requested && (
            <button
              onClick={() => doAction('reject')}
              disabled={loading !== null}
              style={{ background: 'transparent', color: '#C1542C', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, padding: '10px 20px', borderRadius: 10, border: '2px solid #C1542C', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading === 'reject' ? 'Rejecting…' : '✕ Reject Request'}
            </button>
          )}
          {currentStatus.verified && (
            <button
              onClick={() => doAction('revoke')}
              disabled={loading !== null}
              style={{ background: 'transparent', color: '#C1542C', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, padding: '10px 20px', borderRadius: 10, border: '2px solid rgba(193,84,44,0.5)', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading === 'revoke' ? 'Revoking…' : 'Revoke Verification'}
            </button>
          )}
        </div>
      </div>

      {/* Internal notes */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 14, padding: 24 }}>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17, color: '#1B2A4A', margin: '0 0 16px' }}>
          Internal notes <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 400, fontSize: 13, color: '#8A7E66' }}>(never shown to seller)</span>
        </h3>

        {notes.length > 0 && (
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.map((n) => (
              <div key={n.id} style={{ background: 'rgba(27,42,74,0.04)', borderRadius: 10, padding: '12px 16px' }}>
                <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', margin: '0 0 6px', lineHeight: 1.5 }}>{n.text}</p>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>
                  {n.admin_email} · {new Date(n.date_created).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <textarea
            placeholder="Add an internal note…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={2}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', background: '#fff', resize: 'vertical', boxSizing: 'border-box' }}
          />
          <button
            onClick={addNote}
            disabled={loading !== null || !noteText.trim()}
            style={{ background: '#1B2A4A', color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, padding: '10px 18px', borderRadius: 10, border: 'none', cursor: (loading || !noteText.trim()) ? 'not-allowed' : 'pointer', alignSelf: 'flex-end' }}
          >
            {loading === 'note' ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>
    </div>
  );
}
