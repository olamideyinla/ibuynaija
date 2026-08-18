'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NIGERIAN_STATES } from '@/lib/nigerian-states';

interface DeliveryZoneRow {
  state: string;
  fee: number;
}

interface SellerData {
  business_name:               string;
  tagline:                     string | null;
  description:                 string | null;
  state:                       string;
  city_area:                   string;
  bank_account_name:           string | null;
  bank_account_number:         string | null;
  bank_name:                   string | null;
  whatsapp_number:             string | null;
  delivery_zones:              Record<string, number> | null;
  pending_business_name:       string | null;
  name_change_rejected_reason: string | null;
}

function zonesObjectToRows(zones: Record<string, number> | null): DeliveryZoneRow[] {
  if (!zones) return [];
  return Object.entries(zones)
    .filter(([k]) => k !== '__default__')
    .map(([k, v]) => ({ state: k, fee: v }));
}

export default function ProfileForm({ seller }: { seller: SellerData }) {
  const router = useRouter();

  const [tagline,            setTagline]            = useState(seller.tagline ?? '');
  const [description,        setDescription]        = useState(seller.description ?? '');
  const [state,              setState]              = useState(seller.state);
  const [cityArea,           setCityArea]           = useState(seller.city_area);
  const [bankAccountName,    setBankAccountName]    = useState(seller.bank_account_name ?? '');
  const [bankAccountNumber,  setBankAccountNumber]  = useState(seller.bank_account_number ?? '');
  const [bankName,           setBankName]           = useState(seller.bank_name ?? '');
  const [whatsappNumber,     setWhatsappNumber]     = useState(seller.whatsapp_number ?? '');

  const initialZones     = zonesObjectToRows(seller.delivery_zones);
  const initialDefault   = seller.delivery_zones?.['__default__'] ?? null;
  const [zoneRows,       setZoneRows]       = useState<DeliveryZoneRow[]>(initialZones);
  const [defaultFee,     setDefaultFee]     = useState<string>(initialDefault !== null ? String(initialDefault) : '');
  const [useDefault,     setUseDefault]     = useState(initialDefault !== null);

  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  // Business name change request (requires admin approval)
  const [pendingName,        setPendingName]        = useState(seller.pending_business_name);
  const [nameRequestInput,   setNameRequestInput]   = useState('');
  const [nameRequestSaving,  setNameRequestSaving]  = useState(false);
  const [nameRequestError,   setNameRequestError]   = useState('');
  const [nameRequestSuccess, setNameRequestSuccess] = useState(false);

  async function handleNameChangeRequest(e: React.FormEvent) {
    e.preventDefault();
    setNameRequestError('');
    setNameRequestSuccess(false);
    setNameRequestSaving(true);
    try {
      const res = await fetch('/api/seller/name-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_name: nameRequestInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameRequestError(data.error || 'Failed to submit request');
        return;
      }
      setPendingName(data.pending_business_name);
      setNameRequestInput('');
      setNameRequestSuccess(true);
    } catch {
      setNameRequestError('Something went wrong. Please try again.');
    } finally {
      setNameRequestSaving(false);
    }
  }

  function addZoneRow() {
    setZoneRows(prev => [...prev, { state: NIGERIAN_STATES[0], fee: 0 }]);
  }

  function removeZoneRow(idx: number) {
    setZoneRows(prev => prev.filter((_, i) => i !== idx));
  }

  function updateZoneRow(idx: number, field: 'state' | 'fee', value: string | number) {
    setZoneRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  function buildZonesObject(): Record<string, number> {
    const obj: Record<string, number> = {};
    for (const row of zoneRows) {
      if (row.state) obj[row.state] = row.fee;
    }
    if (useDefault && defaultFee !== '') {
      obj['__default__'] = parseFloat(defaultFee) || 0;
    }
    return obj;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch('/api/seller/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagline,
          description,
          state,
          city_area:           cityArea,
          bank_account_name:   bankAccountName,
          bank_account_number: bankAccountNumber,
          bank_name:           bankName,
          whatsapp_number:     whatsappNumber,
          delivery_zones:      buildZonesObject(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save changes');
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // States already used in zone rows (to prevent duplicates in dropdowns)
  const usedStates = new Set(zoneRows.map(r => r.state));

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Business info ── */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>Business info</h2>

        <div style={field}>
          <label style={label}>Business name</label>
          <p style={hint}>Use the same name as your bank account so buyers can verify the transfer.</p>
          <div style={{ ...input, background: 'rgba(27,42,74,0.04)', color: '#1B2A4A', fontWeight: 600 }}>
            {seller.business_name}
          </div>

          {pendingName ? (
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#9B6F00', margin: '8px 0 0', lineHeight: 1.5 }}>
              Pending admin approval: <strong>{pendingName}</strong>
            </p>
          ) : (
            <>
              {seller.name_change_rejected_reason && (
                <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', margin: '8px 0 0', lineHeight: 1.5 }}>
                  Your last name change request was not approved: {seller.name_change_rejected_reason}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  type="text"
                  value={nameRequestInput}
                  onChange={e => setNameRequestInput(e.target.value)}
                  style={{ ...input, flex: 1 }}
                  placeholder="Corrected business name"
                />
                <button
                  type="button"
                  onClick={handleNameChangeRequest}
                  disabled={nameRequestSaving || !nameRequestInput.trim()}
                  style={{
                    fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13,
                    background: '#1B2A4A', color: '#F7F1E3',
                    padding: '0 16px', borderRadius: 9, border: 'none',
                    cursor: nameRequestSaving ? 'default' : 'pointer', flexShrink: 0,
                  }}
                >
                  {nameRequestSaving ? 'Submitting…' : 'Request change'}
                </button>
              </div>
              {nameRequestError && (
                <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#C1542C', margin: '6px 0 0' }}>
                  {nameRequestError}
                </p>
              )}
              {nameRequestSuccess && (
                <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#2E7D32', margin: '6px 0 0' }}>
                  Request submitted — an admin will review it shortly.
                </p>
              )}
            </>
          )}
        </div>

        <div style={field}>
          <label style={label}>Tagline <span style={optional}>(optional)</span></label>
          <input
            type="text"
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            maxLength={120}
            style={input}
            placeholder="Handcrafted Yoruba print bags — Lagos"
          />
        </div>

        <div style={field}>
          <label style={label}>About your shop <span style={optional}>(optional)</span></label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            maxLength={1000}
            style={{ ...input, resize: 'vertical' }}
            placeholder="Tell buyers about your products, your story, and what makes your shop unique…"
          />
        </div>
      </section>

      {/* ── Location ── */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>Location</h2>

        <div style={field}>
          <label style={label}>State</label>
          <select
            value={state}
            onChange={e => setState(e.target.value)}
            required
            style={{ ...input, appearance: 'none' }}
          >
            {NIGERIAN_STATES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={field}>
          <label style={label}>City / Area</label>
          <input
            type="text"
            value={cityArea}
            onChange={e => setCityArea(e.target.value)}
            required
            style={input}
            placeholder="e.g. Ikeja, Enugu GRA"
          />
        </div>
      </section>

      {/* ── Bank details ── */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>Bank details</h2>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 16px', lineHeight: 1.5 }}>
          Shown only on the Order page when a buyer is ready to pay. Never displayed on your public profile.
        </p>

        <div style={field}>
          <label style={label}>Account name</label>
          <input
            type="text"
            value={bankAccountName}
            onChange={e => setBankAccountName(e.target.value)}
            style={input}
            placeholder="e.g. Adaeze N. Okafor"
          />
        </div>

        <div style={field}>
          <label style={label}>Account number</label>
          <input
            type="text"
            value={bankAccountNumber}
            onChange={e => setBankAccountNumber(e.target.value)}
            style={input}
            placeholder="10-digit NUBAN"
            inputMode="numeric"
          />
        </div>

        <div style={field}>
          <label style={label}>Bank name</label>
          <input
            type="text"
            value={bankName}
            onChange={e => setBankName(e.target.value)}
            style={input}
            placeholder="e.g. Zenith Bank"
          />
        </div>
      </section>

      {/* ── WhatsApp ── */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>WhatsApp</h2>

        <div style={field}>
          <label style={label}>WhatsApp number <span style={optional}>(optional)</span></label>
          <p style={hint}>
            Buyers will receive this number after confirming payment so they can follow up with you directly.
          </p>
          <input
            type="tel"
            value={whatsappNumber}
            onChange={e => setWhatsappNumber(e.target.value)}
            style={input}
            placeholder="+2348012345678 or 08012345678"
          />
        </div>
      </section>

      {/* ── Delivery fees ── */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>Delivery fees by state</h2>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 16px', lineHeight: 1.5 }}>
          Set your delivery fee per state. Buyers will see this during checkout. Enter 0 for free delivery.
        </p>

        {/* Per-state rows */}
        {zoneRows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {zoneRows.map((row, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={row.state}
                  onChange={e => updateZoneRow(idx, 'state', e.target.value)}
                  style={{ ...input, flex: 2, appearance: 'none' }}
                >
                  {NIGERIAN_STATES.map(s => (
                    <option key={s} value={s} disabled={usedStates.has(s) && s !== row.state}>
                      {s}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 12,
                    fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66',
                  }}>₦</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={row.fee}
                    onChange={e => updateZoneRow(idx, 'fee', parseFloat(e.target.value) || 0)}
                    style={{ ...input, paddingLeft: 26 }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeZoneRow(idx)}
                  style={{
                    background: 'none', border: '1px solid rgba(193,84,44,0.4)',
                    borderRadius: 7, padding: '8px 12px',
                    color: '#C1542C', cursor: 'pointer',
                    fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addZoneRow}
          style={{
            background: 'none', border: '1px dashed rgba(27,42,74,0.3)',
            borderRadius: 8, padding: '9px 16px',
            color: '#1B2A4A', cursor: 'pointer',
            fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, fontWeight: 600,
            marginBottom: 14,
          }}
        >
          + Add state
        </button>

        {/* Default fee row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <input
            type="checkbox"
            id="use-default-fee"
            checked={useDefault}
            onChange={e => setUseDefault(e.target.checked)}
            style={{ accentColor: '#1B2A4A', width: 16, height: 16, flexShrink: 0 }}
          />
          <label
            htmlFor="use-default-fee"
            style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A', cursor: 'pointer' }}
          >
            Set a fee for all other states
          </label>
          {useDefault && (
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: 140 }}>
              <span style={{
                position: 'absolute', left: 12,
                fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#8A7E66',
              }}>₦</span>
              <input
                type="number"
                min={0}
                step={50}
                value={defaultFee}
                onChange={e => setDefaultFee(e.target.value)}
                style={{ ...input, paddingLeft: 26 }}
                placeholder="0"
              />
            </div>
          )}
        </div>
      </section>

      {error && (
        <p style={{
          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14,
          color: '#C62828', margin: '0 0 16px',
          background: 'rgba(198,40,40,0.06)', padding: '10px 14px', borderRadius: 8,
        }}>
          {error}
        </p>
      )}

      {success && (
        <p style={{
          fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14,
          color: '#2E7D32', margin: '0 0 16px',
          background: 'rgba(46,125,50,0.07)', padding: '10px 14px', borderRadius: 8,
        }}>
          Profile updated successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        style={{
          fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15,
          background: saving ? 'rgba(27,42,74,0.45)' : '#1B2A4A',
          color: '#F7F1E3',
          padding: '13px 0', borderRadius: 10, border: 'none',
          cursor: saving ? 'default' : 'pointer',
          width: '100%',
        }}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

const sectionHeading: React.CSSProperties = {
  fontFamily: "'Space Grotesk',sans-serif",
  fontWeight: 700,
  fontSize: 14,
  color: '#1B2A4A',
  margin: '0 0 16px',
  paddingBottom: 8,
  borderBottom: '1px solid rgba(27,42,74,0.08)',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const field: React.CSSProperties = { marginBottom: 18 };

const label: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 13,
  fontWeight: 600,
  color: '#1B2A4A',
  marginBottom: 7,
};

const hint: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 12,
  color: '#8A7E66',
  margin: '0 0 8px',
  lineHeight: 1.5,
};

const optional: React.CSSProperties = {
  fontWeight: 400,
  color: '#8A7E66',
};

const input: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 9,
  border: '1px solid rgba(27,42,74,0.2)',
  fontSize: 14,
  fontFamily: "'Hanken Grotesk',sans-serif",
  color: '#1B2A4A',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
};
