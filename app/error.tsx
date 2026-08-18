'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: '#1B2A4A', margin: '0 0 12px' }}>
          Something went wrong
        </h1>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: '#8A7E66', lineHeight: 1.6, margin: '0 0 28px' }}>
          An unexpected error occurred. Please try again or return home.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15,
              background: '#1B2A4A', color: '#F7F1E3',
              padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15,
              color: '#1B2A4A', border: '1px solid rgba(27,42,74,0.2)',
              padding: '12px 28px', borderRadius: 10, textDecoration: 'none',
            }}
          >
            Go home
          </a>
        </div>
        {error.digest && (
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', marginTop: 24 }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
