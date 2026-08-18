'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  initialAddresses: string[];
}

export default function AddressBook({ initialAddresses }: Props) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<string[]>(initialAddresses);
  const [newAddress, setNewAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newAddress.trim();
    if (!trimmed) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/buyer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save address');
      setAddresses(data.addresses);
      setNewAddress('');
      setSuccess('Address saved.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(index: number) {
    setDeleting(index);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/buyer/addresses/${index}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to remove address');
      setAddresses(data.addresses);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: '#1B2A4A', marginBottom: 16 }}>
        Saved Delivery Addresses
      </h2>

      {addresses.length === 0 ? (
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', marginBottom: 16 }}>
          No saved addresses yet. Add one below.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {addresses.map((addr, i) => (
            <li
              key={i}
              style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                background: '#FAF8F4', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A', lineHeight: 1.5, flex: 1 }}>
                {addr}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(i)}
                disabled={deleting === i}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#C1542C', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12,
                  fontWeight: 600, flexShrink: 0, padding: '2px 4px',
                }}
              >
                {deleting === i ? '…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {addresses.length < 5 && (
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: '#1B2A4A' }}>
            Add new address
          </label>
          <textarea
            value={newAddress}
            onChange={e => setNewAddress(e.target.value)}
            rows={3}
            placeholder="e.g. 12 Adeola Odeku Street, Victoria Island, Lagos"
            required
            style={{
              fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A',
              border: '1px solid rgba(27,42,74,0.25)', borderRadius: 8, padding: '10px 12px',
              resize: 'vertical', outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={saving || !newAddress.trim()}
            style={{
              alignSelf: 'flex-start',
              background: saving ? 'rgba(27,42,74,0.4)' : '#1B2A4A', color: '#F7F1E3',
              fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, fontWeight: 600,
              border: 'none', borderRadius: 8, padding: '10px 20px',
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save address'}
          </button>
        </form>
      )}

      {addresses.length >= 5 && (
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
          You have reached the maximum of 5 saved addresses. Remove one to add another.
        </p>
      )}

      {error && (
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', marginTop: 12 }}>
          {error}
        </p>
      )}
      {success && (
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#2E7D32', marginTop: 12 }}>
          {success}
        </p>
      )}
    </div>
  );
}
