'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NIGERIAN_STATES } from '@/lib/nigerian-states';

interface SearchFiltersProps {
  query: string;
  initialState: string;
  initialCity: string;
}

export default function SearchFilters({ query, initialState, initialCity }: SearchFiltersProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [city, setCity] = useState(initialCity);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (state) params.set('state', state);
    if (city.trim()) params.set('city', city.trim());
    router.push(`/search?${params.toString()}`);
  }

  function handleClear() {
    setState('');
    setCity('');
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    router.push(`/search?${params.toString()}`);
  }

  const hasFilters = !!initialState || !!initialCity;

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        marginBottom: 32,
        padding: '14px 18px',
        background: '#fff',
        border: '1px solid rgba(27,42,74,0.1)',
        borderRadius: 10,
      }}
    >
      <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, color: '#8A7E66', flexShrink: 0 }}>
        Location:
      </span>

      <select
        value={state}
        onChange={(e) => setState(e.target.value)}
        style={{
          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14,
          padding: '7px 10px', borderRadius: 8,
          border: '1px solid rgba(27,42,74,0.18)',
          background: '#fff', color: state ? '#1B2A4A' : '#8A7E66',
          cursor: 'pointer', minWidth: 140,
        }}
      >
        <option value="">All states</option>
        {NIGERIAN_STATES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <input
        type="text"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="City / area"
        style={{
          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14,
          padding: '7px 10px', borderRadius: 8, outline: 'none',
          border: '1px solid rgba(27,42,74,0.18)',
          background: '#fff', color: '#1B2A4A',
          width: 150,
        }}
      />

      <button
        type="submit"
        style={{
          fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
          background: '#1B2A4A', color: '#F7F1E3',
          padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
        }}
      >
        Apply
      </button>

      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          style={{
            fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600,
            background: 'none', border: 'none', color: '#C1542C',
            cursor: 'pointer', padding: '7px 4px',
          }}
        >
          Clear
        </button>
      )}
    </form>
  );
}
