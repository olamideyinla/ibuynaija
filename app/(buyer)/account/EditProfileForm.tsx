'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  initialFullName: string | null;
  initialPhone:    string | null;
  initialPhone2:   string | null;
  email:           string | null;
}

const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 14, color: '#1B2A4A', background: '#fff', boxSizing: 'border-box',
};
const LABEL: React.CSSProperties = {
  display: 'block', fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 12, fontWeight: 600, color: '#8A7E66', marginBottom: 5, textTransform: 'uppercase',
  letterSpacing: 0.4,
};

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 11, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14 }}>
      <span style={{ color: '#8A7E66', minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#1B2A4A', fontWeight: 600 }}>{value || '—'}</span>
    </div>
  );
}

export default function EditProfileForm({ initialFullName, initialPhone, initialPhone2, email }: Props) {
  const router = useRouter();
  const [editing, setEditing]     = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError]         = useState('');
  const [saved, setSaved]         = useState(false);

  const [fullName, setFullName] = useState(initialFullName ?? '');
  const [phone,    setPhone]    = useState(initialPhone    ?? '');
  const [phone2,   setPhone2]   = useState(initialPhone2   ?? '');

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    startTransition(async () => {
      try {
        const res = await fetch('/api/buyer/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName || null,
            phone:     phone    || null,
            phone2:    phone2   || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Save failed'); return; }
        setSaved(true);
        setEditing(false);
        router.refresh();
      } catch {
        setError('Network error — please try again');
      }
    });
  }

  function handleCancel() {
    setFullName(initialFullName ?? '');
    setPhone(initialPhone       ?? '');
    setPhone2(initialPhone2     ?? '');
    setEditing(false);
    setError('');
  }

  if (!editing) {
    return (
      <div>
        <Row label="Full name"          value={fullName || null} />
        <Row label="Email"              value={email} />
        <Row label="Phone (primary)"    value={phone  || null} />
        <Row label="Phone (secondary)"  value={phone2 || null} />
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => { setEditing(true); setSaved(false); }}
            style={{
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13,
              background: 'none', color: '#1B2A4A',
              border: '1px solid rgba(27,42,74,0.2)', borderRadius: 8,
              padding: '8px 16px', cursor: 'pointer',
            }}
          >
            Edit
          </button>
          {saved && (
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#2E7D32' }}>
              Saved.
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={LABEL}>Full name</label>
          <input
            type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            style={INPUT} placeholder="Your full name"
          />
        </div>
        <div>
          <label style={LABEL}>
            Email <span style={{ color: '#C1542C', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(login credential — cannot be changed here)</span>
          </label>
          <input
            type="email" value={email ?? ''} disabled
            style={{ ...INPUT, background: 'rgba(27,42,74,0.04)', color: '#8A7E66', cursor: 'not-allowed' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LABEL}>Phone (primary)</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              style={INPUT} placeholder="+234 800 000 0000" inputMode="tel"
            />
          </div>
          <div>
            <label style={LABEL}>Phone (secondary) <span style={{ fontWeight: 400 }}>— optional</span></label>
            <input
              type="tel" value={phone2} onChange={e => setPhone2(e.target.value)}
              style={INPUT} placeholder="Alternative number" inputMode="tel"
            />
          </div>
        </div>
      </div>

      {error && (
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', margin: '12px 0 0' }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        <button
          type="submit" disabled={pending}
          style={{
            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13,
            background: '#1B2A4A', color: '#F7F1E3', border: 'none',
            borderRadius: 8, padding: '9px 20px', cursor: pending ? 'default' : 'pointer',
          }}
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button" onClick={handleCancel} disabled={pending}
          style={{
            fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 13,
            background: 'none', color: '#8A7E66',
            border: '1px solid rgba(27,42,74,0.15)', borderRadius: 8,
            padding: '9px 16px', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
