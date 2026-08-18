'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@/lib/format';
import type { PayrollEmployeeRow } from '@/types';

const NAVY = '#1B2A4A';
const MUTED = '#8A7E66';
const RED = '#C1542C';

type FormState = {
  name: string;
  salary_type: 'monthly' | 'daily';
  gross_monthly_salary: string;
  daily_rate: string;
  basic: string;
  housing: string;
  transport: string;
  tax_id: string;
  annual_rent_paid: string;
  pension_applicable: boolean;
  nhf_applicable: boolean;
  nhis_applicable: boolean;
  life_insurance_premium: string;
  bank_name: string;
  bank_account_number: string;
  start_date: string;
  active: boolean;
};

function blankForm(): FormState {
  return {
    name: '', salary_type: 'monthly', gross_monthly_salary: '', daily_rate: '',
    basic: '', housing: '', transport: '', tax_id: '', annual_rent_paid: '',
    pension_applicable: true, nhf_applicable: false, nhis_applicable: false,
    life_insurance_premium: '', bank_name: '', bank_account_number: '',
    start_date: new Date().toISOString().slice(0, 10), active: true,
  };
}

function fromRow(r: PayrollEmployeeRow): FormState {
  const s = r.salary_structure ?? { basic: 0, housing: 0, transport: 0 };
  return {
    name: r.name,
    salary_type: r.salary_type,
    gross_monthly_salary: r.gross_monthly_salary ?? '',
    daily_rate: r.daily_rate ?? '',
    basic: String(s.basic ?? ''),
    housing: String(s.housing ?? ''),
    transport: String(s.transport ?? ''),
    tax_id: r.tax_id ?? '',
    annual_rent_paid: r.annual_rent_paid ?? '',
    pension_applicable: r.pension_applicable,
    nhf_applicable: r.nhf_applicable,
    nhis_applicable: r.nhis_applicable,
    life_insurance_premium: r.life_insurance_premium ?? '',
    bank_name: r.bank_name ?? '',
    bank_account_number: r.bank_account_number ?? '',
    start_date: r.start_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    active: r.active,
  };
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(27,42,74,0.15)',
  fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: NAVY, background: '#fff',
};
const labelStyle: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, fontWeight: 600, color: MUTED,
  display: 'block', marginBottom: 4,
};

export default function EmployeesManager({ initial }: { initial: PayrollEmployeeRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm());
  const [error, setError] = useState('');

  function openAdd() {
    setForm(blankForm());
    setEditingId(null);
    setAdding(true);
    setError('');
  }
  function openEdit(r: PayrollEmployeeRow) {
    setForm(fromRow(r));
    setEditingId(r.id);
    setAdding(false);
    setError('');
  }
  function closeForm() {
    setAdding(false);
    setEditingId(null);
    setError('');
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function save() {
    setError('');
    const body = {
      name: form.name,
      salary_type: form.salary_type,
      gross_monthly_salary: form.gross_monthly_salary || null,
      daily_rate: form.daily_rate || null,
      basic: form.basic || null,
      housing: form.housing || null,
      transport: form.transport || null,
      tax_id: form.tax_id || null,
      annual_rent_paid: form.annual_rent_paid || null,
      pension_applicable: form.pension_applicable,
      nhf_applicable: form.nhf_applicable,
      nhis_applicable: form.nhis_applicable,
      life_insurance_premium: form.life_insurance_premium || null,
      bank_name: form.bank_name || null,
      bank_account_number: form.bank_account_number || null,
      start_date: form.start_date,
      active: form.active,
    };
    const url = editingId ? `/api/payroll/employees/${editingId}` : '/api/payroll/employees';
    const method = editingId ? 'PATCH' : 'POST';
    startTransition(async () => {
      try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) { setError((await res.json()).error ?? 'Could not save'); return; }
        closeForm();
        router.refresh();
      } catch { setError('Network error, please try again'); }
    });
  }

  function remove(r: PayrollEmployeeRow) {
    if (!confirm(`Remove ${r.name} from payroll?`)) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/payroll/employees/${r.id}`, { method: 'DELETE' });
        if (!res.ok) { setError((await res.json()).error ?? 'Could not remove'); return; }
        router.refresh();
      } catch { setError('Network error, please try again'); }
    });
  }

  const showForm = adding || editingId !== null;
  const FREE_LIMIT = 3;
  const activeCount = initial.filter(e => e.active).length;

  return (
    <div>
      {activeCount >= FREE_LIMIT && (
        <div style={{ background: 'rgba(217,160,45,0.1)', border: '1px solid rgba(217,160,45,0.4)', borderRadius: 12, padding: '12px 16px', marginBottom: 18 }}>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, color: '#9B6F00', lineHeight: 1.5 }}>
            You have used your {FREE_LIMIT} free employee slots ({activeCount} active). You can keep adding staff
            for now, but larger teams will need a paid plan in future.
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={openAdd} style={{ background: NAVY, color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 20 }}>
          + Add employee
        </button>
      )}

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.12)', borderRadius: 12, padding: 22, marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 16 }}>
            {editingId ? 'Edit employee' : 'New employee'}
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={labelStyle}>Full name</label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Chinedu Okafor" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Pay type</label>
                <select style={inputStyle} value={form.salary_type} onChange={e => set('salary_type', e.target.value as 'monthly' | 'daily')}>
                  <option value="monthly">Monthly salary</option>
                  <option value="daily">Daily rate</option>
                </select>
              </div>
              {form.salary_type === 'monthly' ? (
                <div>
                  <label style={labelStyle}>Gross monthly salary (₦)</label>
                  <input style={inputStyle} type="number" min="0" value={form.gross_monthly_salary} onChange={e => set('gross_monthly_salary', e.target.value)} placeholder="200000" />
                </div>
              ) : (
                <div>
                  <label style={labelStyle}>Daily rate (₦)</label>
                  <input style={inputStyle} type="number" min="0" value={form.daily_rate} onChange={e => set('daily_rate', e.target.value)} placeholder="5000" />
                </div>
              )}
            </div>

            <details>
              <summary style={{ ...labelStyle, cursor: 'pointer', marginBottom: 8 }}>
                Salary breakdown (optional, defaults to 50 / 30 / 20 split)
              </summary>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div><label style={labelStyle}>Basic</label><input style={inputStyle} type="number" min="0" value={form.basic} onChange={e => set('basic', e.target.value)} /></div>
                <div><label style={labelStyle}>Housing</label><input style={inputStyle} type="number" min="0" value={form.housing} onChange={e => set('housing', e.target.value)} /></div>
                <div><label style={labelStyle}>Transport</label><input style={inputStyle} type="number" min="0" value={form.transport} onChange={e => set('transport', e.target.value)} /></div>
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11.5, color: MUTED, marginTop: 6 }}>
                Only Basic + Housing + Transport are pensionable under NTA 2025.
              </div>
            </details>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={labelStyle}>Tax ID (TIN, optional)</label><input style={inputStyle} value={form.tax_id} onChange={e => set('tax_id', e.target.value)} /></div>
              <div><label style={labelStyle}>Annual rent paid (₦, for relief)</label><input style={inputStyle} type="number" min="0" value={form.annual_rent_paid} onChange={e => set('annual_rent_paid', e.target.value)} placeholder="0" /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={labelStyle}>Bank name (optional)</label><input style={inputStyle} value={form.bank_name} onChange={e => set('bank_name', e.target.value)} /></div>
              <div><label style={labelStyle}>Account number (optional)</label><input style={inputStyle} value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} /></div>
            </div>

            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {([
                ['pension_applicable', 'Deduct pension (8%)'],
                ['nhf_applicable', 'Deduct NHF (2.5%)'],
                ['nhis_applicable', 'Deduct NHIS (5%)'],
              ] as [keyof FormState, string][]).map(([key, lbl]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: NAVY, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form[key] as boolean} onChange={e => set(key, e.target.checked as never)} />
                  {lbl}
                </label>
              ))}
            </div>

            {editingId && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: NAVY, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
                Active (include in payroll runs)
              </label>
            )}
          </div>

          {error && <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: RED, marginTop: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={save} disabled={pending} style={{ background: NAVY, color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: pending ? 'default' : 'pointer' }}>
              {pending ? 'Saving…' : editingId ? 'Save changes' : 'Add employee'}
            </button>
            <button onClick={closeForm} disabled={pending} style={{ background: 'none', color: MUTED, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(27,42,74,0.15)', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {initial.length === 0 && !showForm ? (
        <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: 20, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: MUTED }}>
          No employees yet. Add your first member of staff to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {initial.map(r => (
            <div key={r.id} style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.08)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: r.active ? 1 : 0.6 }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: NAVY }}>
                  {r.name} {!r.active && <span style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>(inactive)</span>}
                </div>
                <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: MUTED }}>
                  {r.salary_type === 'monthly'
                    ? `${formatNaira(r.gross_monthly_salary)} / month`
                    : `${formatNaira(r.daily_rate)} / day`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(r)} disabled={pending} style={{ background: 'none', color: NAVY, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, padding: '6px 12px', border: '1px solid rgba(27,42,74,0.15)', borderRadius: 6, cursor: 'pointer' }}>
                  Edit
                </button>
                <button onClick={() => remove(r)} disabled={pending} style={{ background: 'none', color: RED, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, padding: '6px 12px', border: '1px solid rgba(193,84,44,0.3)', borderRadius: 6, cursor: 'pointer' }}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
