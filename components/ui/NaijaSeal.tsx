interface NaijaSealProps {
  size?: number;
  className?: string;
}

export default function NaijaSeal({ size = 52, className = '' }: NaijaSealProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        transform: 'rotate(-11deg)',
        filter: 'drop-shadow(0 1px 0 rgba(27,42,74,0.04))',
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block', opacity: 0.94 }}>
        <circle cx="50" cy="50" r="48" fill="rgba(247,241,227,0.86)" />
        <circle cx="50" cy="50" r="46.5" fill="none" stroke="#D9A02D" strokeWidth="2.6" />
        <circle cx="50" cy="50" r="37" fill="none" stroke="#D9A02D" strokeWidth="0.9" />
        <text x="50" y="30.5" textAnchor="middle" fill="#D9A02D" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="11">★</text>
        <text x="50" y="44.5" textAnchor="middle" fill="#D9A02D" fontFamily="'Space Grotesk',sans-serif" fontWeight="600" fontSize="8.4" letterSpacing="1.6">MADE IN</text>
        <text x="50" y="64" textAnchor="middle" fill="#D9A02D" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="18.5" letterSpacing="0.5">NAIJA</text>
        <text x="50" y="76.5" textAnchor="middle" fill="#D9A02D" fontFamily="'Space Grotesk',sans-serif" fontWeight="600" fontSize="5.6" letterSpacing="1.7">VERIFIED ORIGIN</text>
      </svg>
    </div>
  );
}
