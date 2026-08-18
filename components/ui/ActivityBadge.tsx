/**
 * ActivityBadge — auto-awarded performance badge.
 *
 * Intentionally distinct from the other two marks so buyers can't confuse them:
 *   NaijaSeal       gold circular stamp, rotated   → product origin / authenticity
 *   VerifiedBadge   dark-navy pill + gold checkmark → business identity / admin trust
 *   ActivityBadge   coloured pill + icon            → marketplace performance signal
 *
 * Variants:
 *   trending   terracotta (#C1542C) with ↑   "Trending"
 *   top_seller deep green (#2E7D32) with ★   "Top Seller"
 */

export type ActivityBadgeVariant = 'trending' | 'top_seller';

interface Props {
  variant: ActivityBadgeVariant;
  size?: 'sm' | 'md';
}

const CONFIG: Record<ActivityBadgeVariant, { icon: string; label: string; bg: string; color: string }> = {
  trending: {
    icon: '↑',
    label: 'Trending',
    bg: '#C1542C',
    color: '#F7F1E3',
  },
  top_seller: {
    icon: '★',
    label: 'Top Seller',
    bg: '#2E7D32',
    color: '#fff',
  },
};

export default function ActivityBadge({ variant, size = 'sm' }: Props) {
  const { icon, label, bg, color } = CONFIG[variant];
  const pad   = size === 'md' ? '4px 10px 4px 7px' : '3px 7px 3px 6px';
  const fs    = size === 'md' ? '11px' : '9px';
  const iconFs = size === 'md' ? '12px' : '10px';

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: bg, color,
      padding: pad, borderRadius: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: iconFs, fontWeight: 700, lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontFamily: "'Hanken Grotesk',sans-serif",
        fontWeight: 700,
        fontSize: fs,
        letterSpacing: '0.3px',
      }}>
        {label}
      </span>
    </div>
  );
}
