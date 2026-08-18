'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';

export interface CategoryOption { id: string; name: string; }

export interface ScheduleEntry {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface ServiceInitial {
  id: string;
  name: string;
  category_id: string;
  description: string;
  price_type: 'fixed' | 'quote';
  price: number | null;
  price_from: number | null;
  duration_minutes: number | null;
  location_type: 'at_provider' | 'provider_travels';
  photos: string[];
  status: 'active' | 'inactive';
  schedules: ScheduleEntry[];
}

interface Props {
  categories: CategoryOption[];
  initial?: ServiceInitial;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 14, color: '#1B2A4A', background: '#fff', boxSizing: 'border-box',
};
const LABEL: React.CSSProperties = {
  display: 'block', fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 13, fontWeight: 600, color: '#1B2A4A', marginBottom: 6,
};
const SECTION: React.CSSProperties = {
  background: '#fff', border: '1px solid rgba(27,42,74,0.08)',
  borderRadius: 14, padding: '20px 24px', marginBottom: 20,
};
const SECTION_TITLE: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, fontWeight: 600,
  color: '#8A7E66', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
};

// ── Photo uploader ────────────────────────────────────────────────────────────

function PhotoUploader({ photos, onChange }: { photos: string[]; onChange: (p: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setUploadError('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError('File must be under 5 MB'); return; }
    setUploadError(''); setUploading(true);
    try {
      const sigRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'ibuynaija/services' }),
      });
      if (!sigRes.ok) throw new Error('Could not start upload');
      const { signature, timestamp, api_key, cloud_name, folder } = await sigRes.json();
      const form = new FormData();
      form.append('file', file); form.append('api_key', api_key);
      form.append('timestamp', String(timestamp)); form.append('signature', signature);
      form.append('folder', folder);
      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: form });
      if (!upRes.ok) { const d = await upRes.json().catch(() => ({})); throw new Error(d.error?.message ?? 'Upload failed'); }
      const result = await upRes.json();
      onChange([...photos, result.secure_url as string]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally { setUploading(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: photos.length ? 10 : 0 }}>
        {photos.map((url, i) => (
          <div key={url} style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${i + 1}`}
              style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(27,42,74,0.12)', display: 'block' }} />
            <button type="button" onClick={() => onChange(photos.filter((_, j) => j !== i))}
              style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(27,42,74,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 11, lineHeight: '20px', textAlign: 'center', padding: 0 }}>
              ×
            </button>
          </div>
        ))}
        {photos.length < 6 && (
          <div onClick={() => !uploading && inputRef.current?.click()}
            style={{ width: 90, height: 90, borderRadius: 8, border: '2px dashed rgba(27,42,74,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'default' : 'pointer', background: '#fafafa' }}>
            <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 24, color: '#8A7E66' }}>
              {uploading ? '…' : '+'}
            </span>
          </div>
        )}
      </div>
      {uploadError && <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#C1542C', margin: '4px 0 0' }}>{uploadError}</p>}
      <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', margin: '4px 0 0' }}>
        JPG, PNG — max 5 MB each · up to 6 photos
      </p>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function ServiceForm({ categories, initial }: Props) {
  const router  = useRouter();
  const isEdit  = !!initial;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Basic info
  const [name, setName]               = useState(initial?.name ?? '');
  const [categoryId, setCategoryId]   = useState(initial?.category_id ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus]           = useState<'active' | 'inactive'>(initial?.status ?? 'active');

  // Pricing
  const [priceType, setPriceType]   = useState<'fixed' | 'quote'>(initial?.price_type ?? 'fixed');
  const [price, setPrice]           = useState(initial?.price != null ? String(initial.price) : '');
  const [priceFrom, setPriceFrom]   = useState(initial?.price_from != null ? String(initial.price_from) : '');

  // Details
  const [duration, setDuration]         = useState(initial?.duration_minutes != null ? String(initial.duration_minutes) : '');
  const [locationType, setLocationType] = useState<'at_provider' | 'provider_travels'>(initial?.location_type ?? 'at_provider');

  // Photos
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);

  // Availability schedule: indexed 0–6 (Sun–Sat)
  const buildInitialSchedules = () => {
    const arr = DAYS.map(() => ({ enabled: false, start_time: '09:00', end_time: '17:00' }));
    for (const s of (initial?.schedules ?? [])) {
      arr[s.day_of_week] = { enabled: true, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) };
    }
    return arr;
  };
  const [schedules, setSchedules] = useState(buildInitialSchedules);

  function setDay(idx: number, field: 'enabled' | 'start_time' | 'end_time', value: boolean | string) {
    setSchedules(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const activeSched = schedules
      .map((d, i) => d.enabled ? { day_of_week: i, start_time: d.start_time, end_time: d.end_time } : null)
      .filter(Boolean) as { day_of_week: number; start_time: string; end_time: string }[];

    startTransition(async () => {
      try {
        const payload = {
          name, category_id: categoryId, description,
          price_type: priceType,
          price:  priceType === 'fixed' ? (parseFloat(price) || null) : null,
          price_from: priceFrom ? (parseFloat(priceFrom) || null) : null,
          duration_minutes: duration ? (parseInt(duration) || null) : null,
          location_type: locationType, photos, status,
          schedules: activeSched,
        };

        const url    = isEdit ? `/api/services/${initial!.id}` : '/api/services';
        const method = isEdit ? 'PATCH' : 'POST';
        const res    = await fetch(url, {
          method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Save failed'); return; }
        router.push('/dashboard/services');
        router.refresh();
      } catch {
        setError('Network error — please try again');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>

      {/* ── Basic Info ── */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}>Basic Information</div>
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Service name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required style={INPUT} placeholder="e.g. Knotless Box Braids (Medium)" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Category *</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required style={{ ...INPUT, appearance: 'none' as const }}>
            <option value="">Select a category…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Description *</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4}
            style={{ ...INPUT, resize: 'vertical' }}
            placeholder="Describe what's included, what buyers should expect, any requirements…" />
        </div>
        <div>
          <label style={LABEL}>Status</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['active', 'inactive'] as const).map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#1B2A4A' }}>
                <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} style={{ accentColor: '#1B2A4A' }} />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pricing ── */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}>Pricing</div>
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Price type *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { value: 'fixed', label: 'Fixed price', desc: 'Buyer pays a set amount and picks a time slot' },
              { value: 'quote', label: 'Quote / Custom job', desc: 'Buyer describes the job and you set the price' },
            ].map(opt => (
              <label key={opt.value} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                border: `2px solid ${priceType === opt.value ? '#1B2A4A' : 'rgba(27,42,74,0.15)'}`,
                background: priceType === opt.value ? 'rgba(27,42,74,0.04)' : '#fff',
              }}>
                <input type="radio" name="price_type" value={opt.value} checked={priceType === opt.value}
                  onChange={() => setPriceType(opt.value as 'fixed' | 'quote')} style={{ marginTop: 3, accentColor: '#1B2A4A' }} />
                <div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: '#1B2A4A' }}>{opt.label}</div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={LABEL}>{priceType === 'fixed' ? 'Price (₦) *' : 'Indicative minimum (₦)'}</label>
            <input type="number" min="0" step="50" value={priceType === 'fixed' ? price : priceFrom}
              onChange={e => priceType === 'fixed' ? setPrice(e.target.value) : setPriceFrom(e.target.value)}
              required={priceType === 'fixed'} style={INPUT} placeholder="e.g. 15000" inputMode="numeric" />
            {priceType === 'quote' && (
              <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', margin: '4px 0 0' }}>
                Optional — shown as "From ₦X" on your listing
              </p>
            )}
          </div>
          {priceType === 'quote' && (
            <div style={{ display: 'none' }} /> // spacer
          )}
        </div>
      </div>

      {/* ── Service Details ── */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}>Service Details</div>
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Estimated duration (minutes)</label>
          <input type="number" min="1" step="15" value={duration} onChange={e => setDuration(e.target.value)}
            style={INPUT} placeholder="e.g. 90" inputMode="numeric" />
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 11, color: '#8A7E66', margin: '4px 0 0' }}>
            Optional — helps buyers plan their time
          </p>
        </div>
        <div>
          <label style={LABEL}>Service location *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { value: 'at_provider', label: 'At my location', desc: 'Customer comes to you' },
              { value: 'provider_travels', label: 'I travel to the customer', desc: 'You go to the buyer\'s location (buyer provides address at booking)' },
            ].map(opt => (
              <label key={opt.value} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                border: `2px solid ${locationType === opt.value ? '#1B2A4A' : 'rgba(27,42,74,0.15)'}`,
                background: locationType === opt.value ? 'rgba(27,42,74,0.04)' : '#fff',
              }}>
                <input type="radio" name="location_type" value={opt.value} checked={locationType === opt.value}
                  onChange={() => setLocationType(opt.value as 'at_provider' | 'provider_travels')} style={{ marginTop: 3, accentColor: '#1B2A4A' }} />
                <div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: '#1B2A4A' }}>{opt.label}</div>
                  <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Photos ── */}
      <div style={SECTION}>
        <div style={SECTION_TITLE}>Photos</div>
        <PhotoUploader photos={photos} onChange={setPhotos} />
      </div>

      {/* ── Availability Schedule (fixed-price only) ── */}
      {priceType === 'fixed' && (
        <div style={SECTION}>
          <div style={SECTION_TITLE}>Weekly Availability</div>
          <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 16px', lineHeight: 1.5 }}>
            Tick the days you are available. Buyers can only book on days you have listed here.
            One time slot per day — split shifts are not supported.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DAYS.map((day, i) => (
              <div key={day} style={{
                border: `1px solid ${schedules[i].enabled ? 'rgba(27,42,74,0.25)' : 'rgba(27,42,74,0.1)'}`,
                borderRadius: 10, padding: '12px 16px',
                background: schedules[i].enabled ? 'rgba(27,42,74,0.03)' : '#fff',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={schedules[i].enabled}
                    onChange={e => setDay(i, 'enabled', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#1B2A4A', flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: '#1B2A4A', minWidth: 90 }}>
                    {day}
                  </span>
                  {schedules[i].enabled && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <input type="time" value={schedules[i].start_time}
                        onChange={e => setDay(i, 'start_time', e.target.value)}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A' }} />
                      <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66' }}>to</span>
                      <input type="time" value={schedules[i].end_time}
                        onChange={e => setDay(i, 'end_time', e.target.value)}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#1B2A4A' }} />
                    </div>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#C1542C', marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button type="submit" disabled={pending} style={{
          background: '#1B2A4A', color: '#F7F1E3',
          fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14,
          padding: '12px 28px', borderRadius: 10, border: 'none',
          cursor: pending ? 'default' : 'pointer',
        }}>
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create service'}
        </button>
        <button type="button" onClick={() => router.back()} disabled={pending} style={{
          background: 'none', color: '#8A7E66', border: '1px solid rgba(27,42,74,0.2)',
          fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 14,
          padding: '12px 20px', borderRadius: 10, cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
