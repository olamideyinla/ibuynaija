'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV_LINKS = [
  { href: '/admin/seller-applications', label: 'Applications' },
  { href: '/admin/verification',        label: 'Verification' },
  { href: '/admin/name-changes',        label: 'Name Changes' },
  { href: '/admin/listings',            label: 'Listing Reports' },
  { href: '/admin/ratings',             label: 'Rating Reports' },
  { href: '/admin/payroll',             label: 'Payroll' },
  { href: '/admin/messages',            label: 'Messages' },
  { href: '/admin/settings',            label: 'Settings' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router   = useRouter();

  // Hide nav on login page
  if (pathname === '/admin/login') return null;

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <nav style={{ background: '#1B2A4A', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 0, height: 52 }}>
      <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#D9A02D', marginRight: 32 }}>
        iBuyNaija Admin
      </span>
      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: "'Hanken Grotesk',sans-serif",
                fontSize: 14,
                fontWeight: active ? 700 : 400,
                color: active ? '#F7F1E3' : 'rgba(247,241,227,0.6)',
                padding: '14px 14px',
                textDecoration: 'none',
                borderBottom: active ? '2px solid #D9A02D' : '2px solid transparent',
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <button
        onClick={handleLogout}
        style={{ background: 'transparent', color: 'rgba(247,241,227,0.6)', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, border: '1px solid rgba(247,241,227,0.2)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
      >
        Log out
      </button>
    </nav>
  );
}
