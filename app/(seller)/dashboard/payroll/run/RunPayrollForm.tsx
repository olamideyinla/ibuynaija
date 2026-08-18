'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const NAVY = '#1B2A4A';
const MUTED = '#8A7E66';

const inputStyle: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(27,42,74,0.15)',
  fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: NAVY, background: '#fff',
};

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function RunPayrollForm({
  activeCount, dailyEmployees, existingPeriods,
}: {
  activeCount: number;
  dailyEmployees: { id: string; name: string }[];
  existingPeriods: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [period, setPeriod] = useState(currentMonth());
  const [days, setDays] = useState<Record<string, string>>(
    Object.fromEntries(dailyEmployees.map(e => [e.id, '26'])),
  );
  const [error, setError] = useState('');

  const alreadyRun = existingPeriods.includes(period);

  function run() {
    setError('');
    const daysWorked: Record<string, number> = {};
    for (const [id, v] of Object.entries(days)) {
      const n = Number(v);
      if (Number.isFinite(n)) daysWorked[id] = n;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/payroll/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period, daysWorked }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Could not run payroll'); return; }
        router.push(`/dashboard/payroll/runs/${data.runId}`);
      } catch { setError('Network error, please try again'); }
    });
  }

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 12, padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 4 }}>
          Payroll month
        </label>
        <input type="month" style={inputStyle} value={period} onChange={e => setPeriod(e.target.value)} />
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: MUTED, marginTop: 8 }}>
          {activeCount} active employee{activeCount === 1 ? '' : 's'} will be included.
        </div>
      </div>

      {dailyEmployees.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: NAVY, marginBottom: 8 }}>
            Days worked (daily-rated staff)
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {dailyEmployees.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: NAVY }}>{e.name}</span>
                <input
                  type="number" min="0" max="31"
                  style={{ ...inputStyle, width: 90 }}
                  value={days[e.id] ?? '26'}
                  onChange={ev => setDays(d => ({ ...d, [e.id]: ev.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {alreadyRun && (
        <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#9B6F00', marginBottom: 12 }}>
          A run already exists for {period}. Delete it from the run page before running again.
        </div>
      )}
      {error && <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', marginBottom: 12 }}>{error}</div>}

      <button
        onClick={run}
        disabled={pending || alreadyRun}
        style={{ background: alreadyRun ? '#B7B0A0' : NAVY, color: '#F7F1E3', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15, padding: '11px 24px', borderRadius: 8, border: 'none', cursor: pending || alreadyRun ? 'default' : 'pointer' }}
      >
        {pending ? 'Calculating…' : `Run payroll for ${period}`}
      </button>
    </div>
  );
}
