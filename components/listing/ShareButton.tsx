'use client';

import { useState } from 'react';

interface ShareButtonProps {
  /** Base URL for the square image (without ?format=) */
  squareUrl: string;
  /** Base URL for the vertical image (without ?format=) */
  verticalUrl: string;
  /** Filename for desktop download (no extension) */
  downloadFilename: string;
  /** Text passed to Web Share API */
  shareTitle: string;
  shareText: string;
  /** Page URL passed when file sharing is unsupported */
  pageUrl?: string;
}

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function ShareButton({
  squareUrl,
  verticalUrl,
  downloadFilename,
  shareTitle,
  shareText,
  pageUrl,
}: ShareButtonProps) {
  const [status, setStatus] = useState<Status>('idle');

  async function handleShare() {
    if (status === 'loading') return;
    setStatus('loading');

    try {
      // Fetch both formats in parallel
      const [squareRes, verticalRes] = await Promise.all([
        fetch(squareUrl),
        fetch(verticalUrl),
      ]);

      if (!squareRes.ok || !verticalRes.ok) {
        throw new Error('Image generation failed');
      }

      const [squareBlob, verticalBlob] = await Promise.all([
        squareRes.blob(),
        verticalRes.blob(),
      ]);

      const squareFile = new File(
        [squareBlob],
        `${downloadFilename}-square.png`,
        { type: 'image/png' },
      );
      const verticalFile = new File(
        [verticalBlob],
        `${downloadFilename}-story.png`,
        { type: 'image/png' },
      );

      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        // Try sharing with image files (mobile, Web Share Level 2)
        if (navigator.canShare?.({ files: [squareFile, verticalFile] })) {
          await navigator.share({
            files: [squareFile, verticalFile],
            title: shareTitle,
            text: shareText,
          });
        } else {
          // Fallback: share URL only (older browsers / desktop)
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: pageUrl ?? window.location.href,
          });
        }
        setStatus('done');
      } else {
        // Desktop with no Web Share API — download square image
        const url = URL.createObjectURL(squareBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${downloadFilename}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('done');
      }
    } catch (err) {
      // User dismissed the share sheet — not an error
      if ((err as DOMException)?.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setStatus('error');
    }

    setTimeout(() => setStatus('idle'), 2500);
  }

  const label =
    status === 'loading' ? 'Generating…' :
    status === 'done'    ? 'Shared!' :
    status === 'error'   ? 'Try again' :
    'Share';

  return (
    <button
      onClick={handleShare}
      disabled={status === 'loading'}
      aria-label={`Share: ${shareTitle}`}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '13px 0',
        background: status === 'done'
          ? 'rgba(27,42,74,0.1)'
          : 'rgba(27,42,74,0.07)',
        border: '1px solid rgba(27,42,74,0.14)',
        borderRadius: 10, cursor: status === 'loading' ? 'default' : 'pointer',
        fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15,
        color: status === 'error' ? '#C1542C' : '#1B2A4A',
        transition: 'background 0.15s, opacity 0.15s',
        opacity: status === 'loading' ? 0.7 : 1,
        outline: 'none',
      }}
    >
      {status === 'loading' ? (
        <SpinnerIcon />
      ) : status === 'done' ? (
        <CheckIcon />
      ) : (
        <ShareIcon />
      )}
      {label}
    </button>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────────── */

function ShareIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16,6 12,2 8,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="2" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="30" />
    </svg>
  );
}
