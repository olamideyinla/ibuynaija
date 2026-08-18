'use client';

import { useState } from 'react';

interface Props {
  listingId: string;
  listingTitle: string;
  sellerWhatsapp: string | null;
}

/** Returns E.164 string, e.g. "+2348012345678" */
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234')) return '+' + digits;
  if (digits.startsWith('0') && digits.length === 11) return '+234' + digits.slice(1);
  return '+' + digits;
}

/** Digits only (no +) for wa.me */
function toWaDigits(raw: string): string {
  return toE164(raw).replace('+', '');
}

export default function EnquireButton({ listingId, listingTitle, sellerWhatsapp }: Props) {
  const [loading, setLoading] = useState(false);
  const [noauth, setNoauth]   = useState(false);

  /** Records the enquiry server-side; returns false if not authenticated. */
  async function recordEnquiry(): Promise<boolean> {
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      });
      if (res.status === 401) { setNoauth(true); return false; }
    } catch {
      // best-effort — don't block the user
    }
    return true;
  }

  async function handleWhatsApp() {
    setLoading(true);
    const ok = await recordEnquiry();
    setLoading(false);
    if (!ok || !sellerWhatsapp) return;
    const msg = encodeURIComponent(
      `Hi, I saw your listing "${listingTitle}" on iBuyNaija and I'm interested. Can you tell me more?`,
    );
    window.open(`https://wa.me/${toWaDigits(sellerWhatsapp)}?text=${msg}`, '_blank', 'noopener,noreferrer');
  }

  async function handleSMS() {
    setLoading(true);
    const ok = await recordEnquiry();
    setLoading(false);
    if (!ok || !sellerWhatsapp) return;
    const number = toE164(sellerWhatsapp);
    const msg = encodeURIComponent(
      `Hi, I saw your listing "${listingTitle}" on iBuyNaija and I'm interested. Can you tell me more?`,
    );
    window.location.href = `sms:${number}?body=${msg}`;
  }

  async function handleContactOnly() {
    setLoading(true);
    await recordEnquiry();
    setLoading(false);
    // No channel to open — enquiry notification goes to seller
  }

  if (noauth) {
    return (
      <a
        href="/login"
        style={{
          display: 'block', textAlign: 'center',
          background: '#C1542C', color: '#F7F1E3',
          fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16,
          padding: '14px 0', borderRadius: 10, textDecoration: 'none', letterSpacing: 0.5,
        }}
      >
        Log in to contact seller
      </a>
    );
  }

  if (sellerWhatsapp) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {/* WhatsApp */}
        <button
          onClick={handleWhatsApp}
          disabled={loading}
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: '#25D366', color: '#fff',
            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15,
            padding: '13px 0', borderRadius: 10, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: 0.3, opacity: loading ? 0.7 : 1,
          }}
        >
          {!loading && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          )}
          {loading ? 'Opening…' : 'WhatsApp'}
        </button>

        {/* SMS */}
        <button
          onClick={handleSMS}
          disabled={loading}
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: '#1B2A4A', color: '#F7F1E3',
            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15,
            padding: '13px 0', borderRadius: 10, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: 0.3, opacity: loading ? 0.7 : 1,
          }}
        >
          {!loading && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
          )}
          {loading ? 'Opening…' : 'SMS'}
        </button>
      </div>
    );
  }

  // No WhatsApp number — plain "Contact Seller" records the enquiry only
  return (
    <button
      onClick={handleContactOnly}
      disabled={loading}
      style={{
        display: 'block', width: '100%', textAlign: 'center',
        background: '#C1542C', color: '#F7F1E3',
        fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16,
        padding: '14px 0', borderRadius: 10, border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        letterSpacing: 0.5, opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? 'Sending…' : 'Contact Seller'}
    </button>
  );
}
