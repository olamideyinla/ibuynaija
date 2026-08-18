import type { ReactNode } from 'react';
import AdminNav from './AdminNav';

export const metadata = { title: 'Admin — iBuyNaija' };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F1E3' }}>
      <AdminNav />
      {children}
    </div>
  );
}
