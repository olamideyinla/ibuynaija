'use client';

import { useState } from 'react';

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update password');
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A',
    border: '1px solid rgba(27,42,74,0.25)', borderRadius: 8, padding: '10px 12px',
    outline: 'none', width: '100%',
  };

  const eyeBtnStyle: React.CSSProperties = {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    border: 'none', background: 'none', cursor: 'pointer',
    color: '#8A7E66', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, fontWeight: 600, padding: '4px 0',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600,
    color: '#1B2A4A', display: 'block', marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: '#1B2A4A', marginBottom: 24 }}>
        Admin Settings
      </h1>

      <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.12)', borderRadius: 12, padding: '24px 28px' }}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: '#1B2A4A', marginBottom: 20 }}>
          Change Password
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Current password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: 56 }}
              />
              <button type="button" onClick={() => setShowCurrent(p => !p)} style={eyeBtnStyle}>
                {showCurrent ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>New password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: 56 }}
              />
              <button type="button" onClick={() => setShowNew(p => !p)} style={eyeBtnStyle}>
                {showNew ? 'Hide' : 'Show'}
              </button>
            </div>
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', marginTop: 4, display: 'block' }}>
              Minimum 8 characters
            </span>
          </div>

          <div>
            <label style={labelStyle}>Confirm new password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: 56 }}
              />
            </div>
          </div>

          {error && (
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', margin: 0 }}>
              {error}
            </p>
          )}
          {success && (
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#2E7D32', margin: 0 }}>
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              background: saving ? 'rgba(27,42,74,0.45)' : '#1B2A4A', color: '#F7F1E3',
              fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, fontWeight: 600,
              border: 'none', borderRadius: 8, padding: '11px 0',
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
