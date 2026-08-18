'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  applicationId: string;
  status: string;
  currentSlug: string;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

const INPUT: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 14, color: '#1B2A4A', background: '#fff', boxSizing: 'border-box',
};

const BTN: React.CSSProperties = {
  fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
  padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
};

export default function ApplicationActions({ applicationId, status, currentSlug }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Slug editing
  const [slug, setSlug]           = useState(currentSlug);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [slugSaved, setSlugSaved] = useState(false);

  // Approve / reject
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm]   = useState(false);
  const [error, setError]                     = useState('');

  if (status !== 'pending') {
    return (
      <div style={{
        background: status === 'approved' ? 'rgba(46,125,50,0.08)' : 'rgba(27,42,74,0.05)',
        border: `1px solid ${status === 'approved' ? 'rgba(46,125,50,0.3)' : 'rgba(27,42,74,0.12)'}`,
        borderRadius: 10, padding: '14px 18px',
        fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14,
        color: status === 'approved' ? '#2E7D32' : '#8A7E66',
      }}>
        This application has already been <strong>{status}</strong>.
      </div>
    );
  }

  function saveSlug() {
    const cleaned = toSlug(slug);
    if (!cleaned) { setSlugError('Slug cannot be empty'); return; }
    setSlugError('');
    setSlugSaved(false);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/seller-applications/${applicationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: cleaned }),
        });
        const data = await res.json();
        if (!res.ok) { setSlugError(data.error ?? 'Save failed'); return; }
        setSlug(data.slug);
        setEditingSlug(false);
        setSlugSaved(true);
        router.refresh();
      } catch {
        setSlugError('Network error — please try again');
      }
    });
  }

  function doAction(action: 'approve' | 'reject') {
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/seller-applications/${applicationId}`, {
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
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Slug editor ── */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '20px 24px' }}>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Shop URL
        </div>

        {editingSlug ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', flexShrink: 0 }}>
                ibuynaija.com/shop/
              </span>
              <input
                value={slug}
                onChange={e => { setSlug(toSlug(e.target.value)); setSlugSaved(false); }}
                style={{ ...INPUT, minWidth: 160, flex: 1 }}
                placeholder="shop-url"
                autoFocus
              />
            </div>
            {slugError && (
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#C1542C', margin: '0 0 8px' }}>
                {slugError}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={saveSlug}
                disabled={pending}
                style={{ ...BTN, fontSize: 13, padding: '8px 16px', background: '#1B2A4A', color: '#F7F1E3' }}
              >
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setSlug(currentSlug); setEditingSlug(false); setSlugError(''); }}
                disabled={pending}
                style={{ ...BTN, fontSize: 13, padding: '8px 16px', background: 'none', color: '#8A7E66', border: '1px solid rgba(27,42,74,0.2)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', fontWeight: 600 }}>
              ibuynaija.com/shop/<strong>{slug}</strong>
            </span>
            <button
              onClick={() => { setEditingSlug(true); setSlugSaved(false); }}
              style={{ ...BTN, fontSize: 12, padding: '5px 12px', background: 'none', color: '#1B2A4A', border: '1px solid rgba(27,42,74,0.2)' }}
            >
              Edit
            </button>
            {slugSaved && (
              <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#2E7D32' }}>
                Saved.
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Decision ── */}
      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 14, padding: '20px 24px' }}>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
          Decision
        </div>

        {error && (
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', marginBottom: 12 }}>
            {error}
          </p>
        )}

        {!showRejectForm ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => doAction('approve')}
              disabled={pending}
              style={{ ...BTN, background: '#2E7D32', color: '#fff' }}
            >
              {pending ? 'Processing…' : 'Approve'}
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={pending}
              style={{ ...BTN, background: 'none', color: '#C1542C', border: '1px solid rgba(193,84,44,0.3)' }}
            >
              Reject
            </button>
          </div>
        ) : (
          <div>
            <label style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: '#1B2A4A', display: 'block', marginBottom: 8 }}>
              Rejection reason <span style={{ color: '#8A7E66', fontWeight: 400 }}>(shown to applicant)</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="e.g. Business name does not match bank account name. Please reapply with matching details."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
                border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif",
                fontSize: 14, color: '#1B2A4A', marginBottom: 12, resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => doAction('reject')}
                disabled={pending}
                style={{ ...BTN, background: '#C1542C', color: '#fff' }}
              >
                {pending ? 'Processing…' : 'Confirm rejection'}
              </button>
              <button
                onClick={() => setShowRejectForm(false)}
                disabled={pending}
                style={{ ...BTN, background: 'none', color: '#8A7E66', border: '1px solid rgba(27,42,74,0.2)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
