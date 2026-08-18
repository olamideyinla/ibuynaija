'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NaijaSeal from '@/components/ui/NaijaSeal';

type AccountType = 'buyer' | 'seller';

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>('buyer');
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      if (accountType === 'seller') {
        router.push('/seller-setup');
      } else {
        router.push('/');
      }
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
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <NaijaSeal size={36} />
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A' }}>
            iBuy<span style={{ color: '#D9A02D' }}>Naija</span>
          </span>
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 6px' }}>
          Create your account
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 24px' }}>
          Join Nigeria&apos;s marketplace for made-in-Nigeria goods.
        </p>

        {/* Account type toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['buyer', 'seller'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setAccountType(type)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontFamily: "'Space Grotesk',sans-serif",
                fontWeight: 700,
                fontSize: 14,
                border: `2px solid ${accountType === type ? '#1B2A4A' : 'rgba(27,42,74,0.15)'}`,
                borderRadius: 9,
                cursor: 'pointer',
                background: accountType === type ? '#1B2A4A' : '#fff',
                color: accountType === type ? '#F7F1E3' : '#1B2A4A',
                transition: 'all 0.12s',
              }}
            >
              {type === 'buyer' ? 'I want to buy' : 'I want to sell'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>
              {accountType === 'seller' ? 'Your name' : 'Full name'}
            </label>
            {accountType === 'seller' && (
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 8px', lineHeight: 1.5 }}>
                Your personal name — not your business name. You will set your business name on the next step.
              </p>
            )}
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoComplete="name"
              autoFocus
              style={inputStyle}
              placeholder="Adaeze Okafor"
            />
          </div>

          <div>
            <label style={labelStyle}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label style={labelStyle}>
              Password <span style={{ color: '#8A7E66', fontWeight: 400 }}>(min 8 characters)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
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
            {loading
              ? 'Creating account…'
              : accountType === 'seller'
              ? 'Continue to shop setup →'
              : 'Create account'}
          </button>
        </form>

        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', marginTop: 24, textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#1B2A4A', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
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
