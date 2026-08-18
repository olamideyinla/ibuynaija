'use client';

/**
 * Shared create/edit form for seller listings.
 *
 * Simple-mode (default): one stock count field, no visible variant concept.
 * Advanced-mode: dynamic variant rows each with attributes + stock count.
 *
 * The seller toggles into advanced mode by clicking "Add size / colour options".
 * Once in advanced mode they can go back only by removing all named variants.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import PhotoUploader from '@/components/PhotoUploader';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
}

interface VariantDraft {
  key: string;       // local unique key, not persisted
  id?: string;       // set for existing DB variants; undefined for newly added ones
  attributes: Record<string, string>;
  price_override: string; // "" = null
  stock_count: string;
}

interface ListingFormProps {
  categories: Category[];
  /** If provided, we're in edit mode. */
  initial?: {
    id: string;
    title: string;
    description: string;
    category_id: string;
    price: string;
    condition: 'new' | 'used';
    photos: string[];
    cover_photo_index: number;
    variants: Array<{
      id: string;
      attributes: Record<string, string>;
      price_override: number | null;
      stock_count: number;
    }>;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let _keyCounter = 0;
function nextKey() { return `v${++_keyCounter}`; }

function newVariantDraft(attrs: Record<string, string> = {}): VariantDraft {
  return { key: nextKey(), attributes: attrs, price_override: '', stock_count: '0' };
}

const LABEL: React.CSSProperties = {
  fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13,
  fontWeight: 600, color: '#1B2A4A', display: 'block', marginBottom: 6,
};
const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid rgba(27,42,74,0.2)', fontFamily: "'Hanken Grotesk',sans-serif",
  fontSize: 14, color: '#1B2A4A', background: '#fff', boxSizing: 'border-box',
};
const FIELD: React.CSSProperties = { marginBottom: 20 };
const BTN_PRIMARY: React.CSSProperties = {
  background: '#1B2A4A', color: '#F7F1E3',
  fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15,
  padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
};
const BTN_GHOST: React.CSSProperties = {
  background: 'none', color: '#1B2A4A',
  fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 13,
  padding: '8px 16px', borderRadius: 8,
  border: '1px solid rgba(27,42,74,0.2)', cursor: 'pointer',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ListingForm({ categories, initial }: ListingFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isEdit = !!initial;

  // Determine initial mode based on whether existing variants are named
  const hasNamedVariants = (initial?.variants ?? []).some(
    v => Object.keys(v.attributes).length > 0,
  );

  // ── Form state ───────────────────────────────────────────────────────────

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '');
  const [price, setPrice] = useState(initial?.price ?? '');
  const [condition, setCondition] = useState<'new' | 'used'>(initial?.condition ?? 'new');
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [coverIdx, setCoverIdx] = useState<number>(initial?.cover_photo_index ?? 0);

  // Single-variant simple mode
  // implicitVariantId tracks the DB id of the one variant in simple-mode edits
  const implicitVariantId = !hasNamedVariants ? (initial?.variants?.[0]?.id ?? null) : null;
  const implicitStock = initial?.variants?.[0]?.stock_count ?? 0;
  const [simpleStock, setSimpleStock] = useState(String(implicitStock));

  // Multi-variant mode
  const [advancedMode, setAdvancedMode] = useState(hasNamedVariants);
  const [variants, setVariants] = useState<VariantDraft[]>(
    hasNamedVariants
      ? (initial?.variants ?? []).map(v => ({
          key: nextKey(),
          id: v.id,
          attributes: v.attributes,
          price_override: v.price_override != null ? String(v.price_override) : '',
          stock_count: String(v.stock_count),
        }))
      : [newVariantDraft()],
  );

  // IDs of DB variants the seller removed in this edit session (to DELETE on save)
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);

  const [error, setError] = useState('');

  // ── Variant helpers ──────────────────────────────────────────────────────

  function addVariant() {
    setVariants(vs => [...vs, newVariantDraft()]);
  }
  function removeVariant(key: string) {
    const toRemove = variants.find(v => v.key === key);
    if (toRemove?.id) {
      setDeletedVariantIds(ids => [...ids, toRemove.id!]);
    }
    setVariants(vs => vs.filter(v => v.key !== key));
  }
  function setVariantField(key: string, field: keyof VariantDraft, value: string) {
    setVariants(vs => vs.map(v => v.key === key ? { ...v, [field]: value } : v));
  }
  function setVariantAttr(key: string, attrKey: string, attrValue: string) {
    setVariants(vs => vs.map(v => {
      if (v.key !== key) return v;
      return { ...v, attributes: { ...v.attributes, [attrKey]: attrValue } };
    }));
  }
  function addAttrKey(variantKey: string, attrKey: string) {
    if (!attrKey.trim()) return;
    setVariants(vs => vs.map(v => {
      if (v.key !== variantKey) return v;
      if (attrKey in v.attributes) return v;
      return { ...v, attributes: { ...v.attributes, [attrKey]: '' } };
    }));
  }
  function removeAttr(variantKey: string, attrKey: string) {
    setVariants(vs => vs.map(v => {
      if (v.key !== variantKey) return v;
      const { [attrKey]: _dropped, ...rest } = v.attributes;
      return { ...v, attributes: rest };
    }));
  }

  function enterAdvancedMode() {
    setAdvancedMode(true);
    // If editing, the implicit simple variant needs to be deleted on save
    if (implicitVariantId) {
      setDeletedVariantIds(ids => [...ids, implicitVariantId]);
    }
    // Pre-populate first variant with current simple stock value
    setVariants([{ key: nextKey(), attributes: {}, price_override: '', stock_count: simpleStock }]);
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const photoUrls = photos.filter(p => p.trim());

    if (photoUrls.length === 0) {
      setError('Add at least one photo to publish this listing.');
      return;
    }

    // Clamp coverIdx to valid range after filtering blank entries
    const safeCoverIdx = photoUrls.length > 0
      ? Math.max(0, Math.min(coverIdx, photoUrls.length - 1))
      : 0;

    const variantPayload = advancedMode
      ? variants.map(v => ({
          attributes: v.attributes,
          price_override: v.price_override ? parseFloat(v.price_override) : null,
          stock_count: parseInt(v.stock_count) || 0,
        }))
      : [{ attributes: {}, price_override: null, stock_count: parseInt(simpleStock) || 0 }];

    const body = {
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId,
      price: price ? parseFloat(price) : null,
      condition,
      made_in_nigeria: true,
      photos: photoUrls,
      cover_photo_index: safeCoverIdx,
      variants: variantPayload,
    };

    startTransition(async () => {
      try {
        const url = isEdit ? `/api/listings/${initial!.id}` : '/api/listings';
        const method = isEdit ? 'PATCH' : 'POST';

        if (isEdit) {
          // 1. Update listing core fields
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: body.title, description: body.description,
              category_id: body.category_id, price: body.price,
              condition: body.condition, photos: body.photos,
              cover_photo_index: body.cover_photo_index,
            }),
          });
          if (!res.ok) {
            const d = await res.json();
            setError(d.error ?? 'Update failed');
            return;
          }

          // 2. Sync variants
          if (!advancedMode) {
            // Simple mode: update the single implicit variant's stock count
            if (implicitVariantId) {
              const vRes = await fetch(`/api/listings/${initial!.id}/variants/${implicitVariantId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock_count: parseInt(simpleStock) || 0 }),
              });
              if (!vRes.ok) {
                const d = await vRes.json();
                setError(d.error ?? 'Failed to update stock');
                return;
              }
            }
          } else {
            // Advanced mode: POST new variants, PATCH existing, then DELETE removed
            // (order matters — add before deleting so the ≥1 constraint is never violated)
            for (const v of variants) {
              const vBody = {
                attributes: v.attributes,
                price_override: v.price_override ? parseFloat(v.price_override) : null,
                stock_count: parseInt(v.stock_count) || 0,
              };
              if (v.id) {
                const vRes = await fetch(`/api/listings/${initial!.id}/variants/${v.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(vBody),
                });
                if (!vRes.ok) {
                  const d = await vRes.json();
                  setError(d.error ?? 'Failed to update variant');
                  return;
                }
              } else {
                const vRes = await fetch(`/api/listings/${initial!.id}/variants`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(vBody),
                });
                if (!vRes.ok) {
                  const d = await vRes.json();
                  setError(d.error ?? 'Failed to add variant');
                  return;
                }
              }
            }
            for (const vid of deletedVariantIds) {
              await fetch(`/api/listings/${initial!.id}/variants/${vid}`, { method: 'DELETE' });
            }
          }

          router.push('/dashboard/listings');
          router.refresh();
        } else {
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.error ?? 'Failed to create listing'); return; }
          router.push('/dashboard/listings');
          router.refresh();
        }
      } catch {
        setError('Network error — please try again');
      }
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit}>
      {/* Title */}
      <div style={FIELD}>
        <label style={LABEL}>Product title</label>
        <input
          style={INPUT} value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Ankara Maxi Wrap Dress — Blue & Gold" required
        />
      </div>

      {/* Description */}
      <div style={FIELD}>
        <label style={LABEL}>Description</label>
        <textarea
          style={{ ...INPUT, minHeight: 100, resize: 'vertical' }}
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Describe your product, materials, sizing, etc." required
        />
      </div>

      {/* Category */}
      <div style={FIELD}>
        <label style={LABEL}>Category</label>
        <select
          style={INPUT} value={categoryId} onChange={e => setCategoryId(e.target.value)} required
        >
          <option value="">Select a category…</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Price + Condition */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, ...FIELD }}>
        <div>
          <label style={LABEL}>Price (₦) — leave blank for &quot;Price on request&quot;</label>
          <input
            style={INPUT} type="number" min="0" step="0.01"
            value={price} onChange={e => setPrice(e.target.value)}
            placeholder="e.g. 28500"
          />
        </div>
        <div>
          <label style={LABEL}>Condition</label>
          <select style={INPUT} value={condition} onChange={e => setCondition(e.target.value as 'new' | 'used')}>
            <option value="new">New</option>
            <option value="used">Used</option>
          </select>
        </div>
      </div>

      {/* Photos */}
      <div style={FIELD}>
        <label style={LABEL}>Photos (up to 5)</label>
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, color: '#8A7E66', margin: '0 0 12px' }}>
          Click a slot to upload or drag an image onto it. Max 2 MB per photo.
          Tap <strong>Cover</strong> to choose the card thumbnail.
        </p>

        {/* 5-slot photo grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const url      = photos[i] ?? '';
            const isCover  = i === coverIdx;
            const isActive = i === 0 || !!photos[i - 1]; // slot is interactive when previous slot is filled

            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* Upload slot */}
                <div style={{ opacity: isActive ? 1 : 0.35, pointerEvents: isActive ? 'auto' : 'none' }}>
                  <PhotoUploader
                    value={url}
                    folder="ibuynaija/listings"
                    onChange={newUrl => {
                      setPhotos(ps => {
                        const next = [...ps];
                        // Ensure array is long enough
                        while (next.length <= i) next.push('');
                        next[i] = newUrl;
                        // If photo removed, collapse trailing empties
                        if (!newUrl) {
                          while (next.length > 1 && !next[next.length - 1]) next.pop();
                        }
                        return next;
                      });
                      // If cover slot cleared, reset cover to first filled photo
                      if (!newUrl && isCover) setCoverIdx(0);
                    }}
                  />
                </div>

                {/* Cover / Set cover controls — only for filled slots */}
                {url && (
                  isCover ? (
                    <span style={{
                      fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 10,
                      color: '#C1542C', background: 'rgba(193,84,44,0.1)',
                      padding: '2px 0', borderRadius: 4, textAlign: 'center',
                    }}>
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCoverIdx(i)}
                      style={{
                        fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 10, color: '#8A7E66',
                        background: 'none', border: '1px solid rgba(27,42,74,0.15)',
                        borderRadius: 4, padding: '2px 0', cursor: 'pointer',
                      }}
                    >
                      Set cover
                    </button>
                  )
                )}

                {/* Slot number for empty inactive slots */}
                {!url && !isActive && (
                  <span style={{
                    fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 10,
                    color: 'rgba(27,42,74,0.25)', textAlign: 'center',
                  }}>
                    Photo {i + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stock / Variants ── */}
      <div style={{ background: 'rgba(27,42,74,0.03)', border: '1px solid rgba(27,42,74,0.1)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#1B2A4A', marginBottom: 4 }}>
          Stock
        </div>

        {!advancedMode ? (
          /* Simple mode ─────────────────────────────────────────────────── */
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...LABEL, marginTop: 12 }}>Stock count</label>
              <input
                style={{ ...INPUT, maxWidth: 160 }}
                type="number" min="0"
                value={simpleStock} onChange={e => setSimpleStock(e.target.value)}
              />
            </div>
            <button type="button" style={{ ...BTN_GHOST, fontSize: 12 }} onClick={enterAdvancedMode}>
              + Add size / colour options
            </button>
          </>
        ) : (
          /* Advanced mode ────────────────────────────────────────────────── */
          <>
            <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', margin: '0 0 16px' }}>
              Each variant can have different attributes (size, colour, etc.), an optional price override, and its own stock count.
            </p>
            {variants.map((v, idx) => (
              <VariantRow
                key={v.key}
                draft={v}
                index={idx}
                onAttrKeyAdd={(ak) => addAttrKey(v.key, ak)}
                onAttrChange={(ak, av) => setVariantAttr(v.key, ak, av)}
                onAttrRemove={(ak) => removeAttr(v.key, ak)}
                onFieldChange={(field, val) => setVariantField(v.key, field, val)}
                onRemove={variants.length > 1 ? () => removeVariant(v.key) : undefined}
              />
            ))}
            <button type="button" style={{ ...BTN_GHOST, marginTop: 8 }} onClick={addVariant}>
              + Add variant
            </button>
          </>
        )}
      </div>

      {error && (
        <p style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, color: '#C1542C', marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button type="submit" style={BTN_PRIMARY} disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Publish listing'}
        </button>
        <button type="button" style={BTN_GHOST} onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Variant row sub-component ─────────────────────────────────────────────────

interface VariantRowProps {
  draft: VariantDraft;
  index: number;
  onAttrKeyAdd: (key: string) => void;
  onAttrChange: (key: string, value: string) => void;
  onAttrRemove: (key: string) => void;
  onFieldChange: (field: keyof VariantDraft, value: string) => void;
  onRemove?: () => void;
}

function VariantRow({ draft, index, onAttrKeyAdd, onAttrChange, onAttrRemove, onFieldChange, onRemove }: VariantRowProps) {
  const [newAttrKey, setNewAttrKey] = useState('');

  const COMMON_ATTRS = ['Size', 'Colour', 'Material', 'Style'];

  return (
    <div style={{ border: '1px solid rgba(27,42,74,0.12)', borderRadius: 10, padding: '14px 16px', marginBottom: 12, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 13, color: '#1B2A4A' }}>
          Variant {index + 1}
        </span>
        {onRemove && (
          <button type="button" style={{ background: 'none', border: 'none', color: '#8A7E66', cursor: 'pointer', fontSize: 13 }} onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      {/* Attribute key-value pairs */}
      {Object.entries(draft.attributes).map(([attrKey, attrVal]) => (
        <div key={attrKey} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13, color: '#8A7E66', minWidth: 64 }}>
            {attrKey}
          </span>
          <input
            style={{ ...INPUT, flex: 1 }}
            value={attrVal}
            onChange={e => onAttrChange(attrKey, e.target.value)}
            placeholder={`Enter ${attrKey.toLowerCase()}`}
          />
          <button type="button" style={{ background: 'none', border: 'none', color: '#8A7E66', cursor: 'pointer' }} onClick={() => onAttrRemove(attrKey)}>✕</button>
        </div>
      ))}

      {/* Add attribute */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select
          style={{ ...INPUT, flex: 1, color: '#8A7E66' }}
          value=""
          onChange={e => { if (e.target.value) { onAttrKeyAdd(e.target.value); } }}
        >
          <option value="">+ Add attribute…</option>
          {COMMON_ATTRS.filter(a => !(a in draft.attributes)).map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
          <option value="__custom__">Custom…</option>
        </select>
        {Object.keys(draft.attributes).length === 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={{ ...INPUT, maxWidth: 120 }}
              value={newAttrKey}
              onChange={e => setNewAttrKey(e.target.value)}
              placeholder="Custom label"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAttrKeyAdd(newAttrKey); setNewAttrKey(''); } }}
            />
            <button type="button" style={BTN_GHOST} onClick={() => { onAttrKeyAdd(newAttrKey); setNewAttrKey(''); }}>Add</button>
          </div>
        )}
      </div>

      {/* Stock + Price override */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={LABEL}>Stock count</label>
          <input
            style={INPUT} type="number" min="0"
            value={draft.stock_count}
            onChange={e => onFieldChange('stock_count', e.target.value)}
          />
        </div>
        <div>
          <label style={LABEL}>Price override (₦) — optional</label>
          <input
            style={INPUT} type="number" min="0" step="0.01"
            value={draft.price_override}
            onChange={e => onFieldChange('price_override', e.target.value)}
            placeholder="Leave blank to use listing price"
          />
        </div>
      </div>
    </div>
  );
}
