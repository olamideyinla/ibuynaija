'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Login failed'); setLoading(false); return; }
      router.push('/admin/verification');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F1E3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400, border: '1px solid rgba(27,42,74,0.1)' }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: '#1B2A4A', margin: '0 0 6px' }}>
          iBuyNaija Admin
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 28px' }}>
          Internal use only
        </p>

        {error && (
          <div style={{ background: 'rgba(193,84,44,0.08)', border: '1px solid rgba(193,84,44,0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: '#1B2A4A', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: '#1B2A4A', background: '#fff', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: '#1B2A4A', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: '#1B2A4A', background: '#fff', boxSizing: 'border-box' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ background: '#1B2A4A', color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, padding: '12px 0', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
