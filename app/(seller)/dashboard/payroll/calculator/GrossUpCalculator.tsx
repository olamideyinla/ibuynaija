'use client';

import { useMemo, useState } from 'react';
import { formatNaira } from '@/lib/format';
import { grossUpFromNet } from '@/lib/payroll/grossup';
import { DEFAULT_STRUCTURE_PCT } from '@/lib/payroll/salary-template';

const NAVY = '#1B2A4A';
const MUTED = '#8A7E66';

const inputStyle: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(27,42,74,0.15)',
  fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: NAVY, background: '#fff', width: '100%',
};
const labelStyle: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12.5, fontWeight: 600, color: MUTED,
  display: 'block', marginBottom: 4,
};

type PctKey = 'basic' | 'housing' | 'transport' | 'lunch' | 'leave';
const PCT_ORDER: { key: PctKey; label: string }[] = [
  { key: 'basic', label: 'Basic' },
  { key: 'housing', label: 'Housing' },
  { key: 'transport', label: 'Transport' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'leave', label: 'Leave' },
];

export default function GrossUpCalculator() {
  const [net, setNet] = useState('150000');
  const [pension, setPension] = useState(true);
  const [nhf, setNhf] = useState(false);
  const [nhis, setNhis] = useState(false);
  const [rent, setRent] = useState('');
  const [pct, setPct] = useState<Record<PctKey, string>>({
    basic: String(DEFAULT_STRUCTURE_PCT.basic * 100),
    housing: String(DEFAULT_STRUCTURE_PCT.housing * 100),
    transport: String(DEFAULT_STRUCTURE_PCT.transport * 100),
    lunch: String(DEFAULT_STRUCTURE_PCT.lunch * 100),
    leave: String(DEFAULT_STRUCTURE_PCT.leave * 100),
  });
  const [extras, setExtras] = useState<{ name: string; amount: string }[]>([]);

  const pctSum = PCT_ORDER.reduce((s, { key }) => s + (parseFloat(pct[key]) || 0), 0);

  const result = useMemo(() => {
    const desiredNet = parseFloat(net);
    if (!Number.isFinite(desiredNet) || desiredNet <= 0) return null;

    // Normalise the percentages so the split always sums to 1.
    const raw: Record<PctKey, number> = {
      basic: parseFloat(pct.basic) || 0,
      housing: parseFloat(pct.housing) || 0,
      transport: parseFloat(pct.transport) || 0,
      lunch: parseFloat(pct.lunch) || 0,
      leave: parseFloat(pct.leave) || 0,
    };
    const total = raw.basic + raw.housing + raw.transport + raw.lunch + raw.leave;
    if (total <= 0) return null;
    const norm = {
      basic: raw.basic / total, housing: raw.housing / total, transport: raw.transport / total,
      lunch: raw.lunch / total, leave: raw.leave / total,
    };

    return grossUpFromNet(desiredNet, {
      pct: norm,
      pensionApplicable: pension,
      nhfApplicable: nhf,
      nhisApplicable: nhis,
      annualRentPaid: rent ? parseFloat(rent) : null,
      extraAllowances: extras
        .filter(e => e.name.trim() && parseFloat(e.amount) > 0)
        .map(e => ({ name: e.name.trim(), amount: parseFloat(e.amount) })),
    });
  }, [net, pension, nhf, nhis, rent, pct, extras]);

  const card: React.CSSProperties = { background: '#fff', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 12, padding: 22 };
  const rowLine: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: NAVY };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={card}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Desired monthly net (take-home) ₦</label>
          <input style={inputStyle} type="number" min="0" value={net} onChange={e => setNet(e.target.value)} placeholder="150000" />
        </div>

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 16 }}>
          {([['pension', pension, setPension, 'Pension (8%)'], ['nhf', nhf, setNhf, 'NHF (2.5%)'], ['nhis', nhis, setNhis, 'NHIS (5%)']] as const).map(([k, val, setter, lbl]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5, color: NAVY, cursor: 'pointer' }}>
              <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} />
              {lbl}
            </label>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Annual rent paid (₦, for rent relief; optional)</label>
          <input style={{ ...inputStyle, maxWidth: 240 }} type="number" min="0" value={rent} onChange={e => setRent(e.target.value)} placeholder="0" />
        </div>

        <details>
          <summary style={{ ...labelStyle, cursor: 'pointer', marginBottom: 10 }}>
            Salary structure split (% of gross){' '}
            <span style={{ color: Math.abs(pctSum - 100) < 0.5 ? '#2E7D32' : '#C1542C' }}>
              (currently {pctSum.toFixed(0)}%)
            </span>
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {PCT_ORDER.map(({ key, label }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input style={inputStyle} type="number" min="0" value={pct[key]} onChange={e => setPct(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11.5, color: MUTED, marginTop: 6 }}>
            Only Basic + Housing + Transport are pensionable. Values are normalised to 100% automatically.
          </div>
        </details>

        <div style={{ marginTop: 16 }}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>Additional allowances (₦ per month, optional)</div>
          {extras.map((ex, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input style={{ ...inputStyle, flex: 2 }} placeholder="Allowance name" value={ex.name} onChange={e => setExtras(a => a.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <input style={{ ...inputStyle, flex: 1 }} type="number" min="0" placeholder="Amount" value={ex.amount} onChange={e => setExtras(a => a.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
              <button onClick={() => setExtras(a => a.filter((_, j) => j !== i))} style={{ background: 'none', border: '1px solid rgba(193,84,44,0.3)', color: '#C1542C', borderRadius: 8, padding: '0 12px', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
          ))}
          <button onClick={() => setExtras(a => [...a, { name: '', amount: '' }])} style={{ background: 'none', border: '1px dashed rgba(27,42,74,0.25)', color: NAVY, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600, borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>
            + Add allowance
          </button>
        </div>
      </div>

      {/* Result */}
      {result && result.requiredGross > 0 && (
        <div style={{ ...card, borderColor: 'rgba(217,160,45,0.5)', background: 'rgba(217,160,45,0.06)' }}>
          <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: MUTED, marginBottom: 2 }}>
            Required monthly gross to net {formatNaira(parseFloat(net))}
          </div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 34, color: NAVY, marginBottom: 16 }}>
            {formatNaira(result.requiredGross)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Earnings</div>
              {result.payslip.earnings.map((e, i) => (
                <div key={i} style={rowLine}><span>{e.name}</span><span>{formatNaira(e.amount)}</span></div>
              ))}
            </div>
            <div>
              <div style={{ ...labelStyle, marginBottom: 6 }}>Deductions</div>
              {result.payslip.deductions.length === 0
                ? <div style={{ ...rowLine, color: MUTED }}><span>None</span><span>{formatNaira(0)}</span></div>
                : result.payslip.deductions.map((d, i) => (
                    <div key={i} style={rowLine}><span>{d.name}</span><span>{formatNaira(d.amount)}</span></div>
                  ))}
              <div style={{ ...rowLine, fontWeight: 700, borderTop: '1px solid rgba(27,42,74,0.15)', marginTop: 4 }}>
                <span>Net pay</span><span>{formatNaira(result.payslip.netPay)}</span>
              </div>
              <div style={{ ...rowLine, color: MUTED, fontSize: 12.5 }}>
                <span>Total employer cost</span><span>{formatNaira(result.payslip.totalEmployerCost)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
        Estimate under the Nigeria Tax Act 2025. This is a management tool, not a licensed payroll processor.
        Confirm figures with a qualified tax professional.
      </p>
    </div>
  );
}
