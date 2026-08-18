'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { NIGERIAN_STATES } from '@/lib/nigerian-states';
import type { PayrollSettingsRow } from '@/types';

const NAVY = '#1B2A4A';
const MUTED = '#8A7E66';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(27,42,74,0.15)',
  fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: NAVY, background: '#fff',
};
const labelStyle: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, fontWeight: 600, color: MUTED,
  display: 'block', marginBottom: 4,
};

export default function SettingsForm({
  initial, defaultState,
}: { initial: PayrollSettingsRow | null; defaultState: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    is_registered_employer: initial?.is_registered_employer ?? false,
    employer_tax_id: initial?.employer_tax_id ?? '',
    pension_enrolled: initial?.pension_enrolled ?? true,
    pfa_name: initial?.pfa_name ?? '',
    pfa_account_number: initial?.pfa_account_number ?? '',
    state_of_operation: initial?.state_of_operation ?? defaultState ?? '',
    nhf_enrolled: initial?.nhf_enrolled ?? false,
    nhis_enrolled: initial?.nhis_enrolled ?? false,
    pay_day: String(initial?.pay_day ?? 25),
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }));
    setSaved(false);
  }

  function save() {
    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/payroll/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, pay_day: Number(form.pay_day) }),
        });
        if (!res.ok) { setError((await res.json()).error ?? 'Could not save'); return; }
        setSaved(true);
        router.refresh();
      } catch { setError('Network error, please try again'); }
    });
  }

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 12, padding: 24, display: 'grid', gap: 16 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: NAVY, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.is_registered_employer} onChange={e => set('is_registered_employer', e.target.checked)} />
        Registered employer (with tax authority)
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Employer tax ID (optional)</label>
          <input style={inputStyle} value={form.employer_tax_id} onChange={e => set('employer_tax_id', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>State of operation (PAYE remittance)</label>
          <select style={inputStyle} value={form.state_of_operation} onChange={e => set('state_of_operation', e.target.value)}>
            <option value="">Select state</option>
            {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Pension Fund Administrator (PFA)</label>
          <input style={inputStyle} value={form.pfa_name} onChange={e => set('pfa_name', e.target.value)} placeholder="e.g. Stanbic IBTC Pension" />
        </div>
        <div>
          <label style={labelStyle}>PFA account number (optional)</label>
          <input style={inputStyle} value={form.pfa_account_number} onChange={e => set('pfa_account_number', e.target.value)} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Pay day (day of month, 1 to 28)</label>
        <input style={{ ...inputStyle, maxWidth: 120 }} type="number" min="1" max="28" value={form.pay_day} onChange={e => set('pay_day', e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: NAVY, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.pension_enrolled} onChange={e => set('pension_enrolled', e.target.checked)} />
          Enrolled in contributory pension
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: NAVY, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.nhf_enrolled} onChange={e => set('nhf_enrolled', e.target.checked)} />
          Enrolled in NHF
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: NAVY, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.nhis_enrolled} onChange={e => set('nhis_enrolled', e.target.checked)} />
          Enrolled in NHIS
        </label>
      </div>

      {error && <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C' }}>{error}</div>}
      {saved && <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#2E7D32' }}>Settings saved.</div>}

      <div>
        <button onClick={save} disabled={pending} style={{ background: NAVY, color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, padding: '10px 22px', borderRadius: 8, border: 'none', cursor: pending ? 'default' : 'pointer' }}>
          {pending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
