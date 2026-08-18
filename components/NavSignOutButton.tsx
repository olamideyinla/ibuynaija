'use client';

export default function NavSignOutButton() {
  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        fontFamily: "'Hanken Grotesk',sans-serif",
        fontWeight: 600,
        fontSize: 14,
        color: 'rgba(247,241,227,0.75)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '7px 10px',
        borderRadius: 7,
      }}
    >
      Sign out
    </button>
  );
}
