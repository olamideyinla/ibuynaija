'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NaijaSeal from '@/components/ui/NaijaSeal';
import { NIGERIAN_STATES } from '@/lib/nigerian-states';

type ProviderType = 'seller' | 'provider' | 'both';

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export default function SellerSetupPage() {
  const router = useRouter();
  const [businessName, setBusinessName]       = useState('');
  const [slug, setSlug]                       = useState('');
  const [slugEdited, setSlugEdited]           = useState(false);
  const [providerType, setProviderType]       = useState<ProviderType>('seller');
  const [state, setState]                     = useState('');
  const [cityArea, setCityArea]               = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName]               = useState('');
  const [error, setError]                     = useState('');
  const [loading, setLoading]                 = useState(false);
  const [submitted, setSubmitted]              = useState(false);

  // Auto-generate slug from business name unless user has manually edited it
  useEffect(() => {
    if (!slugEdited) {
      setSlug(toSlug(businessName));
    }
  }, [businessName, slugEdited]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/seller-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          slug,
          state,
          city_area: cityArea,
          provider_type: providerType,
          bank_account_name: bankAccountName || undefined,
          bank_account_number: bankAccountNumber || undefined,
          bank_name: bankName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Submission failed');
        return;
      }
      setSubmitted(true);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const providerOptions: { value: ProviderType; label: string; desc: string }[] = [
    { value: 'seller',   label: 'Product seller',     desc: 'I sell physical made-in-Nigeria products' },
    { value: 'provider', label: 'Service provider',   desc: 'I offer local services (repairs, catering, etc.)' },
    { value: 'both',     label: 'Both',               desc: 'I sell products and offer services' },
  ];

  if (submitted) {
    return (
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: '#F7F1E3',
      }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
            <NaijaSeal size={36} />
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A' }}>
              iBuy<span style={{ color: '#D9A02D' }}>Naija</span>
            </span>
          </div>
          <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: 12, padding: '24px 22px' }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17, color: '#2E7D32', marginBottom: 8 }}>
              Application submitted!
            </div>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#2E7D32', lineHeight: 1.6, margin: 0 }}>
              Our team will review your shop details and respond within 2 business days.
              You can browse and shop as a buyer in the meantime.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            style={{
              marginTop: 20,
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
              background: '#1B2A4A', color: '#F7F1E3',
              padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
            }}
          >
            Continue to iBuyNaija →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      background: '#F7F1E3',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <NaijaSeal size={36} />
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: '#1B2A4A' }}>
            iBuy<span style={{ color: '#D9A02D' }}>Naija</span>
          </span>
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 26, color: '#1B2A4A', margin: '0 0 6px' }}>
          Set up your shop
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66', margin: '0 0 32px' }}>
          Tell us about your business. Our team reviews every application before your shop goes live.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Account type */}
          <div>
            <label style={labelStyle}>What do you do?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {providerOptions.map(opt => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 14px', borderRadius: 9, cursor: 'pointer',
                    border: `2px solid ${providerType === opt.value ? '#1B2A4A' : 'rgba(27,42,74,0.15)'}`,
                    background: providerType === opt.value ? 'rgba(27,42,74,0.04)' : '#fff',
                  }}
                >
                  <input
                    type="radio"
                    name="provider_type"
                    value={opt.value}
                    checked={providerType === opt.value}
                    onChange={() => setProviderType(opt.value)}
                    style={{ marginTop: 3, accentColor: '#1B2A4A' }}
                  />
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: '#1B2A4A' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>
                      {opt.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Business name */}
          <div>
            <label style={labelStyle}>Business name</label>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 8px', lineHeight: 1.5 }}>
              Use the same name as your bank account. Buyers will see this name on the payment page, so it must match to avoid confusion.
            </p>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              required
              autoFocus
              style={inputStyle}
              placeholder="e.g. Adaeze Crafts"
            />
          </div>

          {/* Slug */}
          <div>
            <label style={labelStyle}>
              Shop URL <span style={{ color: '#8A7E66', fontWeight: 400 }}>— ibuynaija.com/shop/<strong>{slug || '…'}</strong></span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => {
                setSlug(toSlug(e.target.value));
                setSlugEdited(true);
              }}
              required
              style={inputStyle}
              placeholder="adaeze-crafts"
            />
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', margin: '6px 0 0' }}>
              Only lowercase letters, numbers, and hyphens. Cannot be changed easily later.
            </p>
          </div>

          {/* State */}
          <div>
            <label style={labelStyle}>State</label>
            <select
              value={state}
              onChange={e => setState(e.target.value)}
              required
              style={{ ...inputStyle, appearance: 'none' }}
            >
              <option value="">Select a state…</option>
              {NIGERIAN_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* City / Area */}
          <div>
            <label style={labelStyle}>City / Area</label>
            <input
              type="text"
              value={cityArea}
              onChange={e => setCityArea(e.target.value)}
              required
              style={inputStyle}
              placeholder="e.g. Ikeja, Enugu GRA"
            />
          </div>

          {/* Bank details — optional */}
          <div style={{ borderTop: '1px solid rgba(27,42,74,0.1)', paddingTop: 20 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: '#1B2A4A', marginBottom: 4 }}>
              Bank details <span style={{ fontWeight: 400, color: '#8A7E66', fontSize: 13 }}>(optional — add now or later)</span>
            </div>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 14px', lineHeight: 1.5 }}>
              Shown only on the Order page when a buyer is ready to pay. Never displayed on your public profile.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Account name</label>
                <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} style={inputStyle} placeholder="e.g. Adaeze N. Okafor" />
              </div>
              <div>
                <label style={labelStyle}>Account number</label>
                <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} style={inputStyle} placeholder="10-digit NUBAN" inputMode="numeric" />
              </div>
              <div>
                <label style={labelStyle}>Bank name</label>
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} style={inputStyle} placeholder="e.g. Zenith Bank" />
              </div>
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
              padding: '14px 0', borderRadius: 10, border: 'none',
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Submitting…' : 'Submit application →'}
          </button>
        </form>
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
