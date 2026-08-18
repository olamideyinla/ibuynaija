'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Category { id: string; name: string }

interface CategoryPickerProps {
  listingId: string;
  currentCategoryId: string;
  categories: Category[];
}

const INPUT: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(27,42,74,0.2)',
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 14, color: '#1B2A4A', background: '#fff',
  minWidth: 260,
};

export default function CategoryPicker({ listingId, currentCategoryId, categories }: CategoryPickerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState(currentCategoryId);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function handleSave() {
    if (categoryId === currentCategoryId) {
      setMessage({ type: 'err', text: 'Category unchanged.' });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/listing-category/${listingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_id: categoryId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage({ type: 'err', text: data.error ?? 'Update failed' });
        } else {
          setMessage({ type: 'ok', text: 'Category updated.' });
          router.refresh();
        }
      } catch {
        setMessage({ type: 'err', text: 'Network error — please try again.' });
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select style={INPUT} value={categoryId} onChange={e => { setCategoryId(e.target.value); setMessage(null); }}>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={pending}
          style={{
            background: '#1B2A4A', color: '#F7F1E3',
            fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
            padding: '9px 22px', borderRadius: 8, border: 'none', cursor: pending ? 'not-allowed' : 'pointer',
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? 'Saving…' : 'Save category'}
        </button>
      </div>
      {message && (
        <p style={{
          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, margin: 0,
          color: message.type === 'ok' ? '#2E7D32' : '#C1542C',
        }}>
          {message.text}
        </p>
      )}
    </div>
  );
}
