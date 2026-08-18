export default function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const pad = size === 'md' ? '4px 10px 4px 7px' : '3px 7px 3px 5px';
  const fontSize = size === 'md' ? '11px' : '9px';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: '#1B2A4A', color: '#fff',
      padding: pad, borderRadius: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
    }}>
      <svg width={size === 'md' ? 13 : 11} height={size === 'md' ? 13 : 11} viewBox="0 0 24 24" fill="none">
        <path d="M12 2l2.4 1.9 3 .2.9 2.9 2.3 2-1 2.9 1 2.9-2.3 2-.9 2.9-3 .2L12 22l-2.4-1.9-3-.2-.9-2.9-2.3-2 1-2.9-1-2.9 2.3-2 .9-2.9 3-.2z" fill="#D9A02D" />
        <path d="M8.5 12.2l2.3 2.3 4.5-4.6" stroke="#1B2A4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 700, fontSize, letterSpacing: '0.3px' }}>
        Verified
      </span>
    </div>
  );
}
