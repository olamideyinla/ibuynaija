'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

const LABEL: React.CSSProperties = {
  display: 'block', fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 13, fontWeight: 600, color: '#1B2A4A', marginBottom: 6,
};
const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 14, color: '#1B2A4A', background: '#fff', boxSizing: 'border-box',
};
const FIELD: React.CSSProperties = { marginBottom: 16 };

const PROVIDER_OPTIONS: { value: ProviderType; label: string; desc: string }[] = [
  { value: 'seller',   label: 'Product seller',   desc: 'I sell physical made-in-Nigeria products' },
  { value: 'provider', label: 'Service provider', desc: 'I offer local services (repairs, catering, etc.)' },
  { value: 'both',     label: 'Both',             desc: 'I sell products and offer services' },
];

// ── Inline CAC certificate uploader ──────────────────────────────────────────

function CACUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, or a photo of the certificate)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File must be under 5 MB');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const sigRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'ibuynaija/documents' }),
      });
      if (!sigRes.ok) throw new Error('Could not start upload');
      const { signature, timestamp, api_key, cloud_name, folder } = await sigRes.json();

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', api_key);
      form.append('timestamp', String(timestamp));
      form.append('signature', signature);
      form.append('folder', folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
        { method: 'POST', body: form },
      );
      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => ({}));
        throw new Error(d.error?.message ?? 'Upload failed');
      }
      const result = await uploadRes.json();
      onChange(result.secure_url as string);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed — please try again');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {value ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value} alt="CAC certificate"
            style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(27,42,74,0.15)', display: 'block', flexShrink: 0 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#2E7D32', fontWeight: 600 }}>
              Certificate uploaded ✓
            </span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', background: 'none', border: '1px solid rgba(27,42,74,0.15)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#C1542C', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            border: `2px dashed ${uploadError ? 'rgba(193,84,44,0.5)' : 'rgba(27,42,74,0.2)'}`,
            borderRadius: 8, padding: '20px 16px', cursor: uploading ? 'default' : 'pointer',
            textAlign: 'center', background: '#fff',
          }}
        >
          {uploading ? (
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>Uploading…</span>
          ) : (
            <>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', marginBottom: 4 }}>
                Click to upload a photo or scan of your CAC certificate
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66' }}>
                JPG, PNG — max 5 MB
              </div>
            </>
          )}
          {uploadError && (
            <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#C1542C', marginTop: 6 }}>
              {uploadError}
            </div>
          )}
        </div>
      )}
      <input
        ref={inputRef} type="file" accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function BecomeSellerForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState('');

  const [businessName, setBusinessName]           = useState('');
  const [slug, setSlug]                           = useState('');
  const [slugEdited, setSlugEdited]               = useState(false);
  const [providerType, setProviderType]           = useState<ProviderType>('seller');
  const [state, setState]                         = useState('');
  const [cityArea, setCityArea]                   = useState('');
  const [bankAccountName, setBankAccountName]     = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName]                   = useState('');
  const [cacUrl, setCacUrl]                       = useState('');

  useEffect(() => {
    if (!slugEdited) setSlug(toSlug(businessName));
  }, [businessName, slugEdited]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/seller-applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_name:        businessName,
            slug,
            state,
            city_area:            cityArea,
            provider_type:        providerType,
            bank_account_name:    bankAccountName    || undefined,
            bank_account_number:  bankAccountNumber  || undefined,
            bank_name:            bankName           || undefined,
            cac_certificate_url:  cacUrl             || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Submission failed'); return; }
        setSubmitted(true);
        router.refresh();
      } catch {
        setError('Network error — please try again');
      }
    });
  }

  if (submitted) {
    return (
      <div style={{ background: 'rgba(46,125,50,0.08)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: 10, padding: '16px 20px' }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#2E7D32', marginBottom: 4 }}>
          Application submitted!
        </div>
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#2E7D32', lineHeight: 1.5 }}>
          Our team will review your application and respond within 2 business days.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Account type */}
      <div style={FIELD}>
        <label style={LABEL}>What do you do?</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PROVIDER_OPTIONS.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                border: `2px solid ${providerType === opt.value ? '#1B2A4A' : 'rgba(27,42,74,0.15)'}`,
                background: providerType === opt.value ? 'rgba(27,42,74,0.04)' : '#fff',
              }}
            >
              <input
                type="radio" name="provider_type" value={opt.value}
                checked={providerType === opt.value}
                onChange={() => setProviderType(opt.value)}
                style={{ marginTop: 3, accentColor: '#1B2A4A' }}
              />
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: '#1B2A4A' }}>{opt.label}</div>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Business name */}
      <div style={FIELD}>
        <label style={LABEL}>Business / Registered Name *</label>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', margin: '0 0 8px', lineHeight: 1.5 }}>
          Use the exact name on your bank account and/or CAC certificate. Your bank account details must match this name.
        </p>
        <input
          type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
          required style={INPUT} placeholder="e.g. Adaeze Crafts"
        />
      </div>

      {/* Slug */}
      <div style={FIELD}>
        <label style={LABEL}>
          Shop URL — ibuynaija.com/shop/<strong>{slug || '…'}</strong>
        </label>
        <input
          type="text" value={slug}
          onChange={e => { setSlug(toSlug(e.target.value)); setSlugEdited(true); }}
          required style={INPUT} placeholder="adaeze-crafts"
        />
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', margin: '4px 0 0' }}>
          Lowercase letters, numbers, hyphens only. Difficult to change later.
        </p>
      </div>

      {/* State + City */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...FIELD }}>
        <div>
          <label style={LABEL}>State *</label>
          <select value={state} onChange={e => setState(e.target.value)} required style={{ ...INPUT, appearance: 'none' as const }}>
            <option value="">Select…</option>
            {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL}>City / Area *</label>
          <input type="text" value={cityArea} onChange={e => setCityArea(e.target.value)} required style={INPUT} placeholder="e.g. Ikeja" />
        </div>
      </div>

      {/* CAC certificate */}
      <div style={{ ...FIELD, borderTop: '1px solid rgba(27,42,74,0.1)', paddingTop: 16 }}>
        <label style={LABEL}>CAC Certificate / Business Registration <span style={{ fontWeight: 400, color: '#8A7E66' }}>(optional but recommended)</span></label>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', margin: '0 0 10px', lineHeight: 1.5 }}>
          Upload a photo or scan of your CAC certificate, business name registration, or any official document that proves your business name. This helps our team verify your application faster.
        </p>
        <CACUploader value={cacUrl} onChange={setCacUrl} />
      </div>

      {/* Bank details */}
      <div style={{ borderTop: '1px solid rgba(27,42,74,0.1)', paddingTop: 16, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: '#1B2A4A', marginBottom: 4 }}>
          Bank Details <span style={{ fontWeight: 400, color: '#8A7E66', fontSize: 12 }}>(optional — add now or from your dashboard later)</span>
        </div>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', margin: '0 0 12px', lineHeight: 1.5 }}>
          The account name must match your business name above. Shown only to buyers on the payment page.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={LABEL}>Account name</label>
            <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} style={INPUT} placeholder="Exact name on bank account" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL}>Account number</label>
              <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} style={INPUT} placeholder="10-digit NUBAN" inputMode="numeric" />
            </div>
            <div>
              <label style={LABEL}>Bank name</label>
              <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} style={INPUT} placeholder="e.g. Zenith Bank" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', marginBottom: 14 }}>
          {error}
        </p>
      )}

      <button
        type="submit" disabled={pending}
        style={{
          background: '#1B2A4A', color: '#F7F1E3',
          fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
          padding: '12px 24px', borderRadius: 10, border: 'none',
          cursor: pending ? 'default' : 'pointer',
        }}
      >
        {pending ? 'Submitting…' : 'Submit application →'}
      </button>
    </form>
  );
}
