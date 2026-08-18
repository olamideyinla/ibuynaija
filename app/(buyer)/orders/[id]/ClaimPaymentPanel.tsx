'use client';

import { useState, useRef } from 'react';

interface Props {
  orderId: string;
  total: number;
  deliveryFee: number;
  businessName: string;
  sellerWhatsapp: string | null;
  shortId: string;
}

function normaliseWhatsApp(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '234' + digits.slice(1);
  return digits;
}

export default function ClaimPaymentPanel({
  orderId,
  total,
  deliveryFee,
  businessName,
  sellerWhatsapp,
  shortId,
}: Props) {
  const [receiptUrl, setReceiptUrl]       = useState<string | null>(null);
  const [uploading,  setUploading]        = useState(false);
  const [uploadErr,  setUploadErr]        = useState('');
  const [confirmed,  setConfirmed]        = useState(false);
  const [loading,    setLoading]          = useState(false);
  const [error,      setError]            = useState('');
  const [claimed,    setClaimed]          = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalDue = total + deliveryFee;
  const nairaTotal = '₦' + totalDue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr('');
    setUploading(true);
    try {
      // 1. Get signed upload params
      const sigRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'ibuynaija/receipts' }),
      });
      if (!sigRes.ok) {
        const d = await sigRes.json().catch(() => ({}));
        throw new Error(d.error ?? 'Could not get upload signature');
      }
      const { signature, timestamp, folder, api_key, cloud_name } = await sigRes.json();

      // 2. Upload directly to Cloudinary
      const form = new FormData();
      form.append('file', file);
      form.append('signature', signature);
      form.append('timestamp', String(timestamp));
      form.append('api_key', api_key);
      form.append('folder', folder);

      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
        { method: 'POST', body: form },
      );
      if (!upRes.ok) throw new Error('Upload to Cloudinary failed');
      const upData = await upRes.json();
      setReceiptUrl(upData.secure_url);
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleClaim() {
    if (!confirmed) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/orders/${orderId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt_attachment_url: receiptUrl ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }
      setClaimed(true);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  // Success state — show WhatsApp link if seller has a number
  if (claimed) {
    const waNumber = sellerWhatsapp ? normaliseWhatsApp(sellerWhatsapp) : null;
    const waMessage = encodeURIComponent(
      `Hi, I just confirmed payment for order #${shortId} on iBuyNaija. Please confirm receipt. Thank you!`,
    );

    return (
      <div
        style={{
          background: 'rgba(46,125,50,0.06)',
          border: '1px solid rgba(46,125,50,0.3)',
          borderRadius: 14,
          padding: 24,
          marginTop: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#2E7D32', margin: '0 0 8px' }}>
          Payment claimed!
        </h3>
        <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, color: '#1B2A4A', margin: '0 0 20px', lineHeight: 1.5 }}>
          {businessName} has been notified. They will confirm receipt of your transfer.
        </p>
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#25D366',
              color: '#fff',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              padding: '12px 24px',
              borderRadius: 10,
              textDecoration: 'none',
              letterSpacing: 0.3,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Message seller on WhatsApp
          </a>
        )}
        <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, color: '#8A7E66', margin: '16px 0 0', lineHeight: 1.5 }}>
          Refresh this page to see the updated order status.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(217,160,45,0.06)',
        border: '1px solid rgba(217,160,45,0.4)',
        borderRadius: 14,
        padding: 24,
        marginTop: 24,
      }}
    >
      <h3
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 18,
          color: '#1B2A4A',
          margin: '0 0 16px',
        }}
      >
        Have You Paid?
      </h3>

      {/* Receipt upload */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'block',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: '#1B2A4A',
            marginBottom: 6,
          }}
        >
          Attach payment receipt{' '}
          <span style={{ color: '#8A7E66', fontWeight: 400 }}>(optional)</span>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {!receiptUrl ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 9,
              border: '1.5px dashed rgba(27,42,74,0.3)',
              background: '#fff',
              color: uploading ? '#8A7E66' : '#1B2A4A',
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? 'Uploading…' : '📎 Choose file'}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <img
              src={receiptUrl}
              alt="Receipt"
              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(27,42,74,0.15)' }}
            />
            <button
              type="button"
              onClick={() => { setReceiptUrl(null); if (fileRef.current) fileRef.current.value = ''; }}
              style={{
                background: 'none', border: 'none',
                color: '#C1542C', fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 13, cursor: 'pointer', fontWeight: 600,
              }}
            >
              Remove
            </button>
          </div>
        )}

        {uploadErr && (
          <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, color: '#C1542C', margin: '6px 0 0' }}>
            {uploadErr}
          </p>
        )}
      </div>

      {/* Confirmation checkbox */}
      <label
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          cursor: 'pointer',
          marginBottom: 16,
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: 13,
          color: '#1B2A4A',
          lineHeight: 1.5,
        }}
      >
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          style={{ marginTop: 2, flexShrink: 0, accentColor: '#1B2A4A' }}
        />
        I confirm I have made the bank transfer of {nairaTotal} to {businessName}. I understand this
        is my declaration and is not automatically verified.
      </label>

      {error && (
        <div
          style={{
            background: 'rgba(193,84,44,0.08)',
            border: '1px solid rgba(193,84,44,0.4)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 14,
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13,
            color: '#C1542C',
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleClaim}
        disabled={!confirmed || loading}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          background: !confirmed || loading ? '#8A7E66' : '#C1542C',
          color: '#F7F1E3',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 16,
          padding: '14px 0',
          borderRadius: 10,
          border: 'none',
          cursor: !confirmed || loading ? 'not-allowed' : 'pointer',
          letterSpacing: 0.5,
          marginBottom: 12,
        }}
      >
        {loading ? 'Submitting…' : 'I Have Paid'}
      </button>

      <p
        style={{
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: 12,
          color: '#8A7E66',
          margin: 0,
          lineHeight: 1.5,
          textAlign: 'center',
        }}
      >
        iBuyNaija does not verify payments. The seller will confirm receipt of funds before
        processing your order.
      </p>
    </div>
  );
}
