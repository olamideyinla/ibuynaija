import type { OrderStatus } from '@/types';

interface Props {
  status: OrderStatus;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  awaiting_payment:    { label: 'Awaiting Payment',     bg: '#D9A02D', color: '#1B2A4A' },
  payment_claimed:     { label: 'Payment Claimed',      bg: '#C1542C', color: '#F7F1E3' },
  confirmed_by_seller: { label: 'Payment Confirmed',    bg: '#1B2A4A', color: '#F7F1E3' },
  fulfilled:           { label: 'Fulfilled',            bg: '#2E7D32', color: '#F7F1E3' },
  cancelled:           { label: 'Cancelled',            bg: '#8A7E66', color: '#F7F1E3' },
};

export default function OrderStatusBadge({ status }: Props) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#8A7E66', color: '#F7F1E3' };
  return (
    <span
      style={{
        display: 'inline-block',
        background: cfg.bg,
        color: cfg.color,
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: 0.5,
        padding: '4px 10px',
        borderRadius: 20,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}
