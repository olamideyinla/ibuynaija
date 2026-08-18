import Link from 'next/link';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import NaijaSeal from './ui/NaijaSeal';
import NavSignOutButton from './NavSignOutButton';
import { BUYER_COOKIE, SELLER_COOKIE } from '@/lib/cookie';

interface NavbarProps {
  searchQuery?: string;
}

export default async function Navbar({ searchQuery = '' }: NavbarProps) {
  const store     = await cookies();
  const buyerId   = store.get(BUYER_COOKIE)?.value;
  const sellerId  = store.get(SELLER_COOKIE)?.value;
  const loggedIn  = !!buyerId || !!sellerId;
  return (
    <>
      <nav style={{ background: '#1B2A4A', color: '#F7F1E3', position: 'sticky', top: 0, zIndex: 50 }}>
        {/*
          On mobile the logo + nav links leave almost no room for the search bar.
          - Market / Services are hidden from the header and moved to the bottom nav.
          - The bottom nav is fixed at the viewport bottom (shown via media query).
          - globals.css adds body padding-bottom so content never hides behind it.
        */}
        <style>{`
          @media (max-width: 640px) {
            .nb-links-text { display: none !important; }
            .nb-search     { max-width: none !important; }
            .nb-inner      { padding: 0 12px !important; gap: 10px !important; }
            .nb-bottom-nav { display: flex !important; }
          }
        `}</style>

        <div className="nb-inner" style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 60 }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <NaijaSeal size={32} />
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: '#F7F1E3' }}>
              iBuy<span style={{ color: '#D9A02D' }}>Naija</span>
            </span>
          </Link>

          {/* Search bar */}
          <form className="nb-search" action="/search" method="get" style={{ flex: 1, maxWidth: 520 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg style={{ position: 'absolute', left: 12, flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#8A7E66" strokeWidth="2" />
                <path d="M16.5 16.5l4 4" stroke="#8A7E66" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                name="q"
                defaultValue={searchQuery}
                placeholder="Search products..."
                style={{
                  width: '100%', padding: '9px 14px 9px 36px',
                  background: 'rgba(247,241,227,0.1)', border: '1px solid rgba(247,241,227,0.2)',
                  borderRadius: 8, color: '#F7F1E3', fontSize: 14,
                  fontFamily: "'Hanken Grotesk',sans-serif", outline: 'none',
                  // iOS Safari overrides input background on focus, turning
                  // white text invisible. WebkitTextFillColor bypasses that.
                  WebkitTextFillColor: '#F7F1E3',
                  caretColor: '#D9A02D',
                }}
              />
            </div>
          </form>

          {/* Desktop nav links (hidden on mobile — moved to bottom nav) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div className="nb-links-text" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <NavLink href="/products" label="Products" />
              <NavLink href="/services" label="Services" />
            </div>
            {loggedIn ? (
              <>
                {sellerId && <NavLink href="/dashboard" label="Dashboard" />}
                {buyerId && !sellerId && <NavLink href="/orders" label="Orders" />}
                {buyerId && <NavLink href="/account" label="Account" />}
                <NavSignOutButton />
              </>
            ) : (
              <NavLink href="/login" label="Sign in" highlight />
            )}
          </div>
        </div>
      </nav>

      {/*
        Mobile bottom navigation bar — fixed at the viewport bottom.
        Gives Market and Services permanent thumb-reach without crowding the header.
        Hidden on desktop (display:none default), revealed by the media query above.
        globals.css adds body padding-bottom so page content is never obscured.
      */}
      <div
        className="nb-bottom-nav"
        style={{
          display: 'none',
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: 56,
          background: '#1B2A4A',
          borderTop: '1px solid rgba(247,241,227,0.12)',
          zIndex: 50,
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <BottomNavLink href="/products" label="Products" icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        } />
        <BottomNavLink href="/services" label="Services" icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        } />
      </div>
    </>
  );
}

function NavLink({ href, label, highlight }: { href: string; label: string; highlight?: boolean }) {
  return (
    <Link href={href} style={{
      fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 14,
      color: highlight ? '#1B2A4A' : 'rgba(247,241,227,0.85)',
      textDecoration: 'none', padding: '7px 12px', borderRadius: 7,
      background: highlight ? '#D9A02D' : 'transparent',
      transition: 'background 0.15s',
    }}>
      {label}
    </Link>
  );
}

function BottomNavLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: 'rgba(247,241,227,0.75)', minWidth: 64, padding: '6px 0' }}>
      {icon}
      <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 0.3 }}>
        {label}
      </span>
    </Link>
  );
}
