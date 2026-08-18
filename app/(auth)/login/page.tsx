'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NaijaSeal from '@/components/ui/NaijaSeal';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      router.push(data.redirect ?? '/');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      background: '#F7F1E3',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <NaijaSeal size={36} />
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A' }}>
            iBuy<span style={{ color: '#D9A02D' }}>Naija</span>
          </span>
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 6px' }}>
          Sign in
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 28px' }}>
          Welcome back to iBuyNaija
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              style={inputStyle}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: 56 }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#8A7E66', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, fontWeight: 600, padding: '4px 0' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <p style={{
              fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14,
              color: '#C62828', margin: 0,
              background: 'rgba(198,40,40,0.06)', padding: '10px 14px', borderRadius: 8,
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15,
              background: loading ? 'rgba(27,42,74,0.45)' : '#1B2A4A',
              color: '#F7F1E3',
              padding: '13px 0', borderRadius: 10, border: 'none',
              cursor: loading ? 'default' : 'pointer',
              marginTop: 4,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', marginTop: 24, textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: '#1B2A4A', fontWeight: 600, textDecoration: 'none' }}>
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 13,
  fontWeight: 600,
  color: '#1B2A4A',
  marginBottom: 7,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 9,
  border: '1px solid rgba(27,42,74,0.2)',
  fontSize: 14,
  fontFamily: "'Hanken Grotesk',sans-serif",
  color: '#1B2A4A',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
};
