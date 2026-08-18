'use client';

import { useState } from 'react';

export default function CopyLinkBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
      const el = document.getElementById('referral-link-input') as HTMLInputElement | null;
      el?.select();
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
      <input
        id="referral-link-input"
        readOnly
        value={url}
        style={{
          flex: 1, padding: '9px 12px', borderRadius: 8,
          border: '1px solid rgba(27,42,74,0.2)',
          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A',
          background: 'rgba(27,42,74,0.03)',
        }}
        onFocus={e => e.target.select()}
      />
      <button
        onClick={handleCopy}
        style={{
          padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: copied ? 'rgba(46,125,50,0.1)' : '#1B2A4A',
          color: copied ? '#2E7D32' : '#F7F1E3',
          fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13,
          whiteSpace: 'nowrap', transition: 'background 0.15s, color 0.15s',
        }}
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}
